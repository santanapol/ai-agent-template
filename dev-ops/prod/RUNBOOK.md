# Production server — `zero.168bits.com`

Production: **app on droplet** + **MongoDB Atlas** (write) + **Redis** on host via Docker.  
Env files use **`.env.prod`** (not `.env.staging`). See [backend/ENV.md](../../backend/ENV.md).

Server access: [credential.md](./credential.md) (gitignored — SSH host, keys)

Deploy is **SSH only** — no GitHub Actions auto-deploy.

---

## Architecture

```
Cloudflare → Nginx (80/443)
               ├─ /          → PM2 zero-backoffice (Next.js :3005)
               └─ /api,/auth → gateway:3000 → PM2 services
                                      ↓
                    Docker: Redis (127.0.0.1)
                    Atlas: MongoDB (write + read replica for branch master)
```

---

## SSH from dev machine

Production accepts **SSH public key** (password auth disabled).

```bash
# Typical dev key (created at droplet bootstrap — see credential.md)
ssh -i ~/.ssh/do_deploy root@<prod-host>

cd /var/www/zero-platform
git pull
bash scripts/prod/deploy-prod.sh
```

`deploy-prod.sh` ensures **2GB swap**, skips `install-all-deps` when lockfiles unchanged, runs `npm run build`, then `pm2 reload backend/ecosystem.config.js`.

---

## 1. Bootstrap (once)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx docker.io docker-compose-v2 git curl

# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.1 Deploy key + clone (once)

Private repo — server needs a **read-only Deploy key** on GitHub before `git clone` / `git pull`.

| Direction | Private key | Public key | Purpose |
|-----------|-------------|------------|---------|
| Prod → GitHub | on server `~/.ssh/id_ed25519` (or dedicated) | GitHub **Deploy keys** | `git pull` on prod |
| Dev → Prod | on dev machine `~/.ssh/do_deploy` | `~/.ssh/authorized_keys` on prod | SSH login from dev |

**Clone:**

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone --branch main git@github.com:Chiang-Rai-Technology/zero-platform.git zero-platform
```

### 1.2 Environment files

`.env.prod` is **not** in git — create on server from `.env.example`:

```bash
cd /var/www/zero-platform
cp backend/gateway/.env.example backend/gateway/.env.prod
cp backend/auth/.env.example backend/auth/.env.prod
cp backend/service/staff/.env.example backend/service/staff/.env.prod
cp backend/service/agent-invoice/.env.example backend/service/agent-invoice/.env.prod
cp backend/service/smart-report/.env.example backend/service/smart-report/.env.prod
cp backend/service/branch-report/.env.example backend/service/branch-report/.env.prod
# Edit each file — Atlas URIs, GATEWAY_SECRET, JWT keys, CORS for https://zero.168bits.com
```

`deploy-prod.sh` can bootstrap `branch-report/.env.prod` from gateway/auth secrets if missing.

### 1.3 First start

```bash
cd /var/www/zero-platform
bash scripts/staging/ensure-staging-swap.sh   # 2GB droplet — before npm ci / next build
bash backend/scripts/install-all-deps.sh
docker compose -f backend/docker-compose.prod.yml up -d
npm run build --prefix frontend/backoffice-next
pm2 start backend/ecosystem.config.js
pm2 save && pm2 startup
```

---

## 2. Nginx

`/etc/nginx/sites-available/zero-platform`:

```nginx
server {
    listen 80;
    server_name zero.168bits.com;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/zero-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**SSL:** Cloudflare Origin Certificate, or `certbot --nginx -d zero.168bits.com`. Cloudflare SSL mode: **Full (strict)** when origin has a cert.

> **Legacy cutover:** ถ้ายังเห็น UI เก่า (Vite/antd, `<title>frontend</title>`, `/assets/index-*.js`) แปลว่า Nginx ยัง `root frontend/backoffice/dist` — ต้อง proxy ไป `:3005` ตาม config ด้านบน ไม่ใช่ serve static `dist/`.

---

## 3. Deploy (manual, every release)

**On dev (after merge to `main`):**

```bash
./scripts/ci/ci-all.sh          # or npm run ci per service
git push origin main
```

**On prod server** (SSH):

```bash
cd /var/www/zero-platform
git pull
bash scripts/prod/deploy-prod.sh
```

**Verify:**

```bash
pm2 status
curl -sI https://zero.168bits.com
curl -sf http://127.0.0.1:3000/healthz
curl -sf http://127.0.0.1:3104/healthz   # branch-report
```

Smoke in browser: login, branch switcher, key pages.

---

## 4. Post-deploy data ops (when needed)

Run on prod server after **menu/RBAC seed changes** in `backend/auth/scripts/seed-data/permissions.js` or **validator schema** changes in `collection-validators.mjs`.

### RBAC / menus

```bash
cd /var/www/zero-platform
node --env-file=backend/auth/.env.prod backend/auth/scripts/seed-permissions.js --prune
```

`--prune` removes `auth_menus` rows not in seed (e.g. retired `branch-report:marketing`). Users may need logout/login to refresh `/auth/me/menus`.

### Collection validators (prod)

Service accounts cannot `collMod` — use Atlas admin (Booster shell or `MONGODB_ADMIN_URI`):

```bash
MONGODB_ADMIN_URI='mongodb+srv://<admin>@...' \
  node scripts/ops/apply-collection-validators.mjs --prod-all

node scripts/ops/verify-validators.mjs --env-file=backend/auth/.env.prod --db=zero-platform
# repeat for agent-invoice + smart-report env files
```

### Schema baseline dump

From a machine with `backend/*/.env.prod` (read-only):

```bash
node scripts/ops/dump-db-schema.mjs --all-prod --out docs/audit \
  --prod-git-commit="$(git rev-parse HEAD)" \
  --dumped-by="<handle>"
```

Commit `docs/audit/prod-schema-baseline-YYYY-MM-DD.{json,md}` + update `DEFAULT_PROD_BASELINE` in `scripts/ops/schema-verify-targets.mjs`.

---

## Do not

- Use `.env.staging` on this server
- Reuse staging secrets or local harness passwords
- Skip swap on 2GB droplets before `npm ci` / `next build`
- Commit `.env.prod` or [credential.md](./credential.md)
