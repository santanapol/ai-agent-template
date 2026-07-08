# RUNBOOK — Local development & operations

คู่มือรวมวิธี boot, seed, ทดสอบ และแก้ปัญหาเบื้องต้นของ **zero-platform** ในเครื่อง local

> เอกสารนี้เป็น **hub** — รายละเอียดลึกแยกตาม layer อยู่ในลิงก์ด้านล่าง ไม่ต้องอ่านทุกไฟล์ถ้าแค่ต้องการรัน stack

| เอกสารลึก | เนื้อหา |
|-----------|---------|
| [**backend/ENV.md**](./backend/ENV.md) | **ไฟล์ env** — `.env.harness` / `.env` / `.env.prod` |
| [backend/RUNBOOK.md](./backend/RUNBOOK.md) | Manual backend, deploy checklist |
| [frontend/backoffice/RUNBOOK.md](./frontend/backoffice/RUNBOOK.md) | Vite proxy, `.env.local`, UI troubleshooting |
| [harness-engineering/workflows.md](./harness-engineering/workflows.md) | SDLC, `PORT_OFFSET`, observability, browser testing |
| [scripts/README.md](./scripts/README.md) | สคริปต์ harness ทั้งหมด |
| [DEPLOY_DIGITALOCEAN.md](./DEPLOY_DIGITALOCEAN.md) | Production CI/CD |
| [docs/observability.md](./docs/observability.md) | Query logs/metrics |

---

## Prerequisites

| Layer | Requirement |
|-------|-------------|
| Backend | Node.js `>=24 <25`, Docker (MongoDB + Redis) |
| Frontend | Node.js (ดู `frontend/backoffice/package.json`) |
| Harness scripts | Bash, repo root as cwd |

---

## Ports (offset 0)

| Component | Port | Notes |
|-----------|:----:|-------|
| gateway | 3000 | Client / Vite `/api` proxy |
| auth | 3001 | Login, JWKS, refresh |
| demo-service | 3002 | `/api/v1/me`, `/api/v1/items` |
| staff | 3101 | Profiles API |
| agent-invoice | 3102 | Invoices & fees |
| smart-report | 3103 | Reports |
| branch-report | 3104 | Branch marketing reports |
| backoffice (Vite) | 5175 | ต้อง `--with-frontend` หรือรัน manual |
| MongoDB | 27017 | `backend/docker compose` |
| Redis | 6379 | `token_gen` revoke channel |

`PORT_OFFSET=N` เลื่อนทุกพอร์ต + แยก Mongo DB (`auth_login_N`) — ดู [§ หลาย worktree](#หลาย-worktree-port_offset)

---

## วิธีรัน — เลือกแบบที่เหมาะ

### A. Harness (แนะนำ) — คำสั่งเดียว boot ทั้ง stack

```bash
./scripts/dev-up.sh --with-frontend   # backend + UI + seed
./scripts/smoke.sh                    # healthz + login + gateway
```

| Flag | ผล |
|------|-----|
| `--with-frontend` | เปิด backoffice ที่ `:5175` (ไม่ใส่ = backend อย่างเดียว) |
| `--skip-seed` | boot เร็วขึ้น ไม่ re-seed |
| `--no-obs` | ไม่ boot VictoriaLogs/Metrics |

```bash
./scripts/seed-all.sh      # re-seed โดยไม่ restart services
./scripts/dev-down.sh      # หยุดทุกอย่าง (รวม frontend + obs)
```

#### หยุด stack (teardown)

```bash
./scripts/dev-down.sh
```

หยุด **Node services ทั้งหมด** ที่ harness เปิด: auth, gateway, demo, staff, agent-invoice, smart-report, branch-report, backoffice (Vite), observability (ถ้าเปิด)

| หยุด | ยังรันอยู่ |
|------|-----------|
| services ข้างบน | **MongoDB + Redis** (Docker) — ค้างไว้ใช้รอบถัดไป |

หยุด MongoDB/Redis เมื่อเลิกทำงาน:

```bash
cd backend && docker compose down
```

ลบ state ของ instance (logs, pids, env):

```bash
rm -rf .dev-run/0
```

`PORT_OFFSET` ต้องส่งตอน down ด้วย: `PORT_OFFSET=100 ./scripts/dev-down.sh`

**Manual mode:** `Ctrl+C` ในแต่ละ terminal ที่รัน `npm run dev`

Runtime ต่อ instance: `.dev-run/<offset>/` (`logs/`, `pids/` เท่านั้น)

Harness env: `backend/<service>/.env.harness` — ดู [backend/ENV.md](./backend/ENV.md)

```bash
tail -f .dev-run/0/logs/gateway.log
# พอร์ต: PORT_OFFSET=0 → gateway :3000 (dev-lib.sh → dev_load_ports)
```

### B. Manual backend — แยก terminal

```bash
cd backend && docker compose up -d

# Terminal 1
cd backend/auth && npm ci && npm run create-env && npm run init:db && npm run dev

# Terminal 2
cd backend/gateway && cp .env.example .env && npm ci && npm run dev

# Terminal 3+ (optional)
cd backend/service/demo-service && cp .env.example .env && npm ci && npm run dev
```

ค่า env สำคัญ: `JWT_JWKS_URL`, `GATEWAY_SECRET` (≥32 ตัว), `REDIS_URL=redis://127.0.0.1:6379/0` — ดู [backend/ENV.md](./backend/ENV.md)

รายละเอียด env + deploy checklist: [backend/ENV.md](./backend/ENV.md) · [backend/RUNBOOK.md](./backend/RUNBOOK.md)

### C. Manual frontend — ต้องมี backend รันอยู่แล้ว

```bash
cd frontend/backoffice-next
npm ci --legacy-peer-deps
cp .env.local.example .env.local   # optional — mesh bypass headers
npm run dev
```

| Next rewrite | Target |
|-----------|--------|
| `/auth` | `http://127.0.0.1:3001` |
| `/api` | `http://127.0.0.1:3000` |

UI: `http://localhost:3005` · Legacy Vite app: [frontend/backoffice/DEPRECATED.md](./frontend/backoffice/DEPRECATED.md)

---

## Login & seed data

หลัง harness boot + seed (default):

| Field | Value |
|-------|-------|
| Username | `platform_admin` (หรือ `branch_admin`, `support_admin`, `support`, `staff`) |
| Password | `1234` (ทุก user ที่ seed) |

Harness smoke login: `platform_admin` / `1234` (ค่า default ใน `dev-lib.sh`)

`seed-all.sh` seed: auth users + permissions, staff profiles, demo items, smart reports, agent-invoice sample, branch-report `gpp_777ww` minimal data

---

## Smoke test (curl)

```bash
# Token (native client)
curl -s -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"platform_admin","password":"1234","client_kind":"native"}'

# ผ่าน gateway
curl -s http://127.0.0.1:3000/api/v1/me -H "Authorization: Bearer <access_token>"
```

หรือใช้ `./scripts/smoke.sh` (คำนวณพอร์ตจาก `PORT_OFFSET` อัตโนมัติ)

---

## ทดสอบก่อน PR / CI

```bash
./scripts/ci-all.sh                  # backend CI ×7 + frontend + docs + smoke
./scripts/ci-all.sh --skip-install   # ข้าม npm ci
./scripts/ci-all.sh --skip-smoke     # ไม่ boot stack
./scripts/ci-all.sh --with-frontend  # smoke รวม Vite proxy
./scripts/ci-all.sh --only backend   # เฉพาะ phase ที่ต้องการ
```

Per-package: `npm run ci` ใน directory ของ service นั้น

---

## Observability (optional)

```bash
./scripts/dev-obs-up.sh    # VictoriaLogs :9428, VictoriaMetrics :8428
./scripts/dev-obs-down.sh
```

ดู query ตัวอย่าง: [docs/observability.md](./docs/observability.md)

---

## หลาย worktree (`PORT_OFFSET`)

```bash
# Instance หลัก
./scripts/dev-up.sh

# Worktree อื่น — ไม่ชน port/DB
PORT_OFFSET=100 ./scripts/dev-up.sh --with-frontend
PORT_OFFSET=100 ./scripts/smoke.sh
PORT_OFFSET=100 ./scripts/dev-down.sh
```

| ทรัพยากร | offset 0 | offset 100 |
|----------|----------|------------|
| gateway | :3000 | :3100 |
| auth | :3001 | :3101 |
| backoffice | :5175 | :5275 |
| Mongo DB | `auth_login_0` | `auth_login_100` |
| Runtime | `.dev-run/0/` | `.dev-run/100/` |

---

## Troubleshooting (สรุป)

| อาการ | วิธีแก้ |
|-------|---------|
| `:3005` เปิดไม่ได้ | รัน `./scripts/dev-up.sh --with-frontend` หรือ `cd frontend/backoffice-next && npm run dev` |
| Login ไม่ผ่าน | ลอง `1234` · รัน `./scripts/seed-all.sh` · ตรวจ `backend/auth/.env.harness` (`DATABASE_URI`) |
| 502 จาก Vite proxy | auth (:3001) หรือ gateway (:3000) ยังไม่รัน |
| 401 ที่ gateway | Token หมดอายุ / `token_gen` revoked — login ใหม่ |
| 403 ที่ upstream | `GATEWAY_SECRET` ไม่ตรงหรือสั้นกว่า 32 ตัว |
| `E11000 duplicate key` | username ซ้ำใน Mongo — re-seed หรือลบ user เก่า |
| `503 /readyz` | Redis ไม่ขึ้น — `cd backend && docker compose ps` |

รายละเอียด: [backend/RUNBOOK.md](./backend/RUNBOOK.md) · [frontend/backoffice/RUNBOOK.md](./frontend/backoffice/RUNBOOK.md)

---

## Frontend verification

```bash
cd frontend/backoffice-next && npm run lint && npm test && npm run build
./scripts/dev-up.sh --with-frontend && ./scripts/smoke.sh
```

Audit checklist: [docs/exec-plans/active/frontend-ui-audit-2026-07.md](./docs/exec-plans/active/frontend-ui-audit-2026-07.md)

---

## Related

- [README.md](./README.md) — ภาพรวม repo
- [AGENTS.md](./AGENTS.md) — map สำหรับ agents
- [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md) — trust boundary, gateway mesh
