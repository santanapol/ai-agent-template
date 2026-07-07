# Staging server — `zero-staging.168bits.com`

All-in-one staging: **app + MongoDB + Redis** on one host via Docker.  
Env files use **`.env.staging`** (not `.env.prod`). See [backend/ENV.md](../../backend/ENV.md).

Server access: [credential.md](./credential.md)

---

## Architecture

```
Cloudflare → Nginx (80/443)
               ├─ /          → frontend/backoffice/dist
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

Clone repo (deploy key): see [DEPLOY_DIGITALOCEAN.md](../../DEPLOY_DIGITALOCEAN.md) §1.2 — use `/var/www/zero-platform`.

**หรือรันสคริปต์รวม** (แทนขั้น 1–5 ด้านล่าง):

```bash
cd /var/www/zero-platform
# เครื่องใหม่ทั้งหมด (apt + node + pm2 + nginx + ufw + app):
bash scripts/setup-staging.sh --host --nginx

# มี OS packages แล้ว:
bash scripts/setup-staging.sh --nginx
```

Re-deploy หลัง `git pull`: `bash scripts/deploy-staging.sh` · smoke จาก local: `SMOKE_PASSWORD='…' bash scripts/smoke-staging.sh`

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
bash scripts/staging-init-env.sh   # skip ถ้ามี .env.staging แล้ว
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
cp frontend/backoffice/.env.staging.example frontend/backoffice/.env.staging
```

---

## 3. Docker (DB on host)

```bash
cd backend
docker compose -f docker-compose.staging.yml up -d
```

`docker-compose.staging.yml` — standalone (ไม่ merge กับ `docker-compose.yml` เพื่อหลีกเลี่ยงพอร์ตซ้ำ)

---

## 4. Install, DB init, build

```bash
cd /var/www/zero-platform
bash backend/scripts/install-all-deps.sh

# Bootstrap MongoDB + example data (uses .env.staging — NOT seed-all.sh)
bash scripts/staging-seed-all.sh

npm run build:staging --prefix frontend/backoffice
```

`staging-seed-all.sh` = `init-db` + seed ทุก service (reuse scripts เดิมกับ `--env-file=.env.staging`).  
ห้ามใช้ `./scripts/seed-all.sh` — มันอ่าน `.env.harness` สำหรับ local dev เท่านั้น

ตรวจความสมบูรณ์: `bash scripts/staging-verify-seed.sh` — ดูรายละเอียด users/DB ใน [credential.md](./credential.md)

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

    root /var/www/zero-platform/frontend/backoffice/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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
docker compose -f backend/docker-compose.yml ps
curl -sI https://zero-staging.168bits.com
```

Login smoke: use credentials from `init:db` / seed (not local `admin/1234` unless you seeded that).

---

## Deploy (manual)

**บนเครื่อง local (ก่อน push):**

```bash
./scripts/ci-all.sh          # หรือ npm run ci ต่อ service
git push
```

**บน server:**

```bash
cd /var/www/zero-platform
git pull
bash scripts/deploy-staging.sh
```

**กลับมาที่ local — smoke ผ่าน HTTPS (แนะนำ):**

```bash
SMOKE_PASSWORD='…' bash scripts/smoke-staging.sh
# หรือ
SMOKE_PASSWORD='…' STAGING_URL=https://zero-staging.168bits.com bash scripts/smoke-staging.sh
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
