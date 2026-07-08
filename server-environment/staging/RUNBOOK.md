# Staging server — `zero-staging.168bits.com`

All-in-one staging: **app + MongoDB + Redis** on one host via Docker.  
Env files use **`.env.staging`** (not `.env.prod`). See [backend/ENV.md](../../backend/ENV.md).

Server access: [credential.md](./credential.md)

---

## Architecture

```
Cloudflare → Nginx (80/443)
               ├─ /          → PM2 zero-backoffice (Next.js :3005)
               └─ /api,/auth → gateway:3000 → PM2 services
                                      ↓
                    Docker: MongoDB + Redis (127.0.0.1 only)
```

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

Private repo — server ต้องมี **Deploy key** (read-only) บน GitHub ก่อน `git clone` / `git pull`

> **อย่าสลับกับ GitHub Actions secret `DO_SSH_KEY`** — คนละกุญแจ (ดู [docs/deploy/digitalocean.md](../../docs/deploy/digitalocean.md) §2)

| ทิศทาง | Private key | Public key | ใช้ทำอะไร |
|--------|-------------|------------|-----------|
| Staging → GitHub | บน server `~/.ssh/zero-staging-deploy` | GitHub **Deploy keys** | `git pull` บน staging |
| Dev/CI → Staging | เครื่อง dev / GitHub Secret | `~/.ssh/authorized_keys` บน server | SSH เข้า server |

**1. สร้างกุญแจบน staging server** (รันบน `143.198.213.26`):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "zero-staging-deploy" -f ~/.ssh/zero-staging-deploy -N ""
chmod 600 ~/.ssh/zero-staging-deploy
cat ~/.ssh/zero-staging-deploy.pub
```

**2. ใส่ใน GitHub** (ทำครั้งเดียว):

- Repo **Chiang-Rai-Technology/zero-platform** → **Settings** → **Deploy keys** → **Add deploy key**
- Title: `zero-staging (143.198.213.26)` (หรือชื่อที่จำง่าย)
- Key: วาง output จาก `zero-staging-deploy.pub`
- ✅ **Allow read access** (ไม่ต้อง write)
- หรือจากเครื่อง dev (ถ้ามี `gh` login):

```bash
gh api repos/Chiang-Rai-Technology/zero-platform/keys \
  -f title='zero-staging (143.198.213.26)' \
  -f key="$(ssh root@143.198.213.26 'cat ~/.ssh/zero-staging-deploy.pub')" \
  -F read_only=true
```

**3. ตั้ง SSH config บน server** (ให้ `git` ใช้กุญแจนี้กับ GitHub):

```bash
cat > ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/zero-staging-deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

**4. ทดสอบ:**

```bash
ssh -T git@github.com
# คาดหวัง: Hi Chiang-Rai-Technology/zero-platform! You've successfully authenticated...
```

**5. Clone:**

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone --branch main git@github.com:Chiang-Rai-Technology/zero-platform.git zero-platform
cd zero-platform
git status   # ต้องเป็น git repo ปกติ (มี .git/objects)
```

**ย้ายจาก tarball (ถ้าเคย sync โค้ดแบบไม่มี git):**

```bash
# backup env ก่อน
BACKUP=/tmp/staging-env-backup
mkdir -p "$BACKUP"
find /var/www/zero-platform -name '.env.staging' -exec cp --parents {} "$BACKUP/" \;

mv /var/www/zero-platform /var/www/zero-platform.bak-tarball
git clone --branch main git@github.com:Chiang-Rai-Technology/zero-platform.git /var/www/zero-platform

# restore env
while IFS= read -r f; do
  dest="/var/www/zero-platform/${f#"$BACKUP/var/www/zero-platform/"}"
  mkdir -p "$(dirname "$dest")" && cp "$f" "$dest"
done < <(find "$BACKUP" -name '.env.staging')

cd /var/www/zero-platform && bash scripts/staging/deploy-staging.sh
```

Deploy key ที่ตั้งไว้แล้วบน server นี้: ชื่อ `zero-staging (143.198.213.26)` ใน GitHub Deploy keys

---

**หรือรันสคริปต์รวม** (หลัง clone + deploy key แล้ว — แทนขั้น 2–6 ด้านล่าง):

```bash
cd /var/www/zero-platform
# เครื่องใหม่ทั้งหมด (apt + node + pm2 + nginx + ufw + app):
bash scripts/staging/setup-staging.sh --host --nginx

# มี OS packages แล้ว:
bash scripts/staging/setup-staging.sh --nginx
```

Re-deploy หลัง `git pull`: `bash scripts/staging/deploy-staging.sh` · smoke จาก local: `SMOKE_PASSWORD='…' bash scripts/staging/smoke-staging.sh`

---

## 2. Environment files

`.env.staging` ถูกสร้างไว้ใน repo แล้ว (gitignored) — copy ไป staging server หรือรัน `staging-init-env.sh` ถ้าต้องการสร้างใหม่

### Write vs Read — ไม่งง

| ชนิด | ชี้ไปไหน | ใช้ทำอะไร |
|------|----------|-----------|
| **Write** (`DATABASE_URI` / `MONGODB_URI`) | Docker MongoDB บนเครื่อง staging `127.0.0.1:27017` | users, staff, invoice, report metadata — **ข้อมูล staging แยกจาก prod** |
| **Read** (`MONGODB_URI_READ`) | Prod Atlas read replica (`zero-api-read`) | สาขา `gpp_777ww` — **read-only, ข้อมูลจริง** |

แบบเดียวกับ local dev (`.env.harness`) — staging เขียน DB เอง แต่อ่าน branch master จาก prod

**ห้าม** ใช้ prod write URI (`zero-api`, `zero-invoice-api`, …) บน staging

### แก้ค่า (ถ้าจำเป็น)

```bash
# บน staging server หลัง clone
bash scripts/staging/staging-init-env.sh   # skip ถ้ามี .env.staging แล้ว
```

ค่าหลักที่ตั้งไว้แล้ว:

| Key | Staging value |
|-----|---------------|
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `DATABASE_URI` / `MONGODB_URI` | `mongodb://127.0.0.1:27017/...` (local Docker) |
| `MONGODB_URI_READ` | prod Atlas `zero-api-read` (already set) |
| `REDIS_URL` | `redis://127.0.0.1:6379/0` |
| `GATEWAY_SECRET` / `GATEWAY_SHARED_SECRET` | staging-only (already set, ≠ prod) |
| `JWT_*` / `CORS_ORIGINS` | `https://zero-staging.168bits.com` |
| `ADMIN_USERNAME` | `platform_admin` |
| `ADMIN_PASSWORD` | see [credential.md](./credential.md) |

Frontend:

```bash
cp frontend/backoffice-next/.env.staging.example frontend/backoffice-next/.env.staging
```

---

## 3. Docker (DB on host)

```bash
cd backend
docker compose -f docker-compose.staging.yml up -d
```

MongoDB + Redis อยู่ใน [`docker-compose.deps.yml`](../../backend/docker-compose.deps.yml) (shared กับ local).  
`docker-compose.staging.yml` และ `docker-compose.yml` (local) ทั้งคู่ `include` ไฟล์นี้ — พอร์ต bind `127.0.0.1:6379` / `127.0.0.1:27017`, project name `zero-platform`.

---

## 4. Install, DB init, build

```bash
cd /var/www/zero-platform
bash backend/scripts/install-all-deps.sh

# Bootstrap MongoDB + example data (uses .env.staging — NOT seed-all.sh)
bash scripts/staging/staging-seed-all.sh

npm run build:staging --prefix frontend/backoffice-next
```

`staging-seed-all.sh` = `init-db` + seed ทุก service (reuse scripts เดิมกับ `--env-file=.env.staging`).  
ห้ามใช้ `./scripts/dev/seed-all.sh` — มันอ่าน `.env.harness` สำหรับ local dev เท่านั้น

ตรวจความสมบูรณ์: `bash scripts/staging/staging-verify-seed.sh` — ดูรายละเอียด users/DB ใน [credential.md](./credential.md)

---

## 5. PM2 (staging config)

```bash
pm2 start backend/ecosystem.staging.config.js
pm2 save && pm2 startup
```

Reload after deploy:

```bash
pm2 reload backend/ecosystem.staging.config.js
```

---

## 6. Nginx

`/etc/nginx/sites-available/zero-staging`:

```nginx
server {
    listen 80;
    server_name zero-staging.168bits.com;

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
sudo ln -sf /etc/nginx/sites-available/zero-staging /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**SSL:** Cloudflare Origin Certificate on origin, or `certbot --nginx -d zero-staging.168bits.com`.  
Cloudflare SSL mode: **Full (strict)** when origin has a cert.

---

## 7. Verify

```bash
pm2 status
cd backend && docker compose -f docker-compose.staging.yml ps
curl -sI https://zero-staging.168bits.com
```

Login smoke: use credentials from `init:db` / seed (not local `admin/1234` unless you seeded that).

---

## Deploy (manual)

**บนเครื่อง local (ก่อน push):**

```bash
./scripts/ci/ci-all.sh          # หรือ npm run ci ต่อ service
git push
```

**บน server** (ต้องมี deploy key แล้ว — §1.1):

```bash
cd /var/www/zero-platform
git pull
bash scripts/staging/deploy-staging.sh
```

**กลับมาที่ local — smoke ผ่าน HTTPS (แนะนำ):**

```bash
SMOKE_PASSWORD='…' bash scripts/staging/smoke-staging.sh
# หรือ
SMOKE_PASSWORD='…' STAGING_URL=https://zero-staging.168bits.com bash scripts/staging/smoke-staging.sh
```

รหัสผ่านดูใน [credential.md](./credential.md) (`platform_admin` / `EXAMPLE_*_PASSWORD`)  
ตัวแปร: `STAGING_URL` (default `https://zero-staging.168bits.com`), `SMOKE_USERNAME`, `SMOKE_PASSWORD`

ตรวจ: frontend shell → `POST /auth/login` → `GET /auth/me/branches` → `GET /api/v1/smart-reports`

จากนั้นทดสอบ browser ด้วยมือ (login, branch switcher, หน้าหลัก)

---

## Do not

- Use `.env.prod` on this server
- Reuse production secrets or MongoDB data
- Expose ports `27017` / `6379` to the public internet
- Commit `.env.staging` or [credential.md](./credential.md)
