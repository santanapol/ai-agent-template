# RUNBOOK — Local development & operations

คู่มือรวมวิธี boot, seed, ทดสอบ และแก้ปัญหาเบื้องต้นของ **zero-platform** ในเครื่อง local

> เอกสารนี้เป็น **hub** — รายละเอียดลึกแยกตาม layer อยู่ในลิงก์ด้านล่าง ไม่ต้องอ่านทุกไฟล์ถ้าแค่ต้องการรัน stack

| เอกสารลึก | เนื้อหา |
|-----------|---------|
| [**backend/ENV.md**](./backend/ENV.md) | **ไฟล์ env** — `.env.harness` / `.env` / `.env.prod` |
| [backend/RUNBOOK.md](./backend/RUNBOOK.md) | Manual backend, deploy checklist |
| [frontend/backoffice-next/README.md](./frontend/backoffice-next/README.md) | Next.js rewrites, `.env.local`, UI conventions |
| [harness-engineering/workflows.md](./harness-engineering/workflows.md) | SDLC, `PORT_OFFSET`, observability, browser testing |
| [scripts/README.md](./scripts/README.md) | สคริปต์ harness ทั้งหมด |
| [docs/deploy/digitalocean.md](./docs/deploy/digitalocean.md) | Production CI/CD |
| [docs/observability.md](./docs/observability.md) | Query logs/metrics |

---

## Prerequisites

| Layer | Requirement |
|-------|-------------|
| Backend | Node.js `>=24 <25`, Docker (MongoDB + Redis) |
| Frontend | Node.js (ดู `frontend/backoffice-next/package.json`) |
| Harness scripts | Bash, repo root as cwd |

---

## Ports (offset 0)

| Component | Port | Notes |
|-----------|:----:|-------|
| gateway | 3000 | Client / Next.js `/api` rewrite target |
| auth | 3001 | Login, JWKS, refresh |
| demo-service | 3002 | `/api/v1/me`, `/api/v1/items` |
| staff | 3101 | Profiles API |
| agent-invoice | 3102 | Invoices & fees |
| smart-report | 3103 | Reports |
| branch-report | 3104 | Branch marketing reports |
| backoffice-next | 3005 | ต้อง `--with-frontend` หรือรัน manual |
| MongoDB | 27017 | `backend/docker compose` (`127.0.0.1`, project `zero-platform`) |
| Redis | 6379 | `token_gen` revoke channel |

`PORT_OFFSET=N` เลื่อนทุกพอร์ต + แยก Mongo DB (`zero-platform_N`) — ดู [§ หลาย worktree](#หลาย-worktree-port_offset)

---

## วิธีรัน — เลือกแบบที่เหมาะ

### A. Harness (แนะนำ) — คำสั่งเดียว boot ทั้ง stack

```bash
./scripts/dev/dev-up.sh --with-frontend   # backend + UI + seed
./scripts/dev/smoke.sh                    # healthz + login + gateway
```

| Flag | ผล |
|------|-----|
| `--with-frontend` | เปิด backoffice-next ที่ `:3005` (ไม่ใส่ = backend อย่างเดียว) |
| `--skip-seed` | boot เร็วขึ้น ไม่ re-seed |
| `--no-obs` | ไม่ boot VictoriaLogs/Metrics |

```bash
./scripts/dev/seed-all.sh      # re-seed โดยไม่ restart services
./scripts/dev/dev-down.sh      # หยุดทุกอย่าง (รวม frontend + obs)
```

#### หยุด stack (teardown)

```bash
./scripts/dev/dev-down.sh
```

หยุด **Node services ทั้งหมด** ที่ harness เปิด: auth, gateway, demo, staff, agent-invoice, smart-report, branch-report, backoffice-next, observability (ถ้าเปิด)

| หยุด | ยังรันอยู่ |
|------|-----------|
| services ข้างบน | **MongoDB + Redis** (Docker) — ค้างไว้ใช้รอบถัดไป |

หยุด MongoDB/Redis เมื่อเลิกทำงาน:

```bash
cd backend && docker compose down
# ปิด observability ด้วย (ถ้าเปิดไว้):
cd backend && docker compose -f docker-compose.observability.yml down
```

Docker project name: **`zero-platform`** (deps + observability อยู่กลุ่มเดียวกันใน Docker Desktop). Shared DB stack: `backend/docker-compose.deps.yml`.

ลบ state ของ instance (logs, pids, env):

```bash
rm -rf .dev-run/0
```

`PORT_OFFSET` ต้องส่งตอน down ด้วย: `PORT_OFFSET=100 ./scripts/dev/dev-down.sh`

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

UI: `http://localhost:3005`

---

## Login & seed data

หลัง harness boot + seed (default):

| Field | Value |
|-------|-------|
| Username | `platform_admin` (หรือ `branch_admin`, `support_admin`, `support`, `staff`) |
| Password | `1234` (ทุก user ที่ seed) |

Harness smoke login: `platform_admin` / `1234` (ค่า default ใน `dev-lib.sh`)

`seed-all.sh` seed: auth users + permissions, staff profiles, demo items, smart reports, agent-invoice sample, branch-report `gpp_777ww` minimal data. ท้าย seed รัน **`./scripts/dev/verify-harness-schema.sh`** อัตโนมัติ (validators registry + prod baseline parity + indexes).

**branch-report:** seed เขียนลง Mongo **localhost เท่านั้น**. ถ้า `MONGODB_URI_READ` ใน `.env.harness` เป็น Atlas → script ข้ามพร้อมเหตุผล (ไม่พัง `seed-all`). ต้องการข้อมูล domain: ตั้งค่าตาม [backend/ENV.md](./backend/ENV.md) (localhost + `gpp_777ww`) แล้วรัน seed ใหม่.

#### Quick start: local domain data

สามคำสั่งสำหรับ Channel Performance / invite-links บน localhost (ต้องมี Mongo Docker รันอยู่):

```bash
cp backend/service/branch-report/.env.harness.example backend/service/branch-report/.env.harness
cd backend/service/branch-report && npm run seed:example
curl -s "http://127.0.0.1:3000/api/v1/branch-report/invite-links" -H "Authorization: Bearer <token>"
```

`<token>` จาก `./scripts/dev/smoke.sh` หรือ login curl ด้านล่าง · ตรวจ Mongo counts (+ optional gateway): `./scripts/dev/verify-branch-report-seed.sh`

Checklist หลัง seed + active branch `777WW`:

```bash
# หลัง login + switch branch (777WW / 5f4fb5bb3156af7a2db9e5a0)
curl -s "http://127.0.0.1:3000/api/v1/branch-report/invite-links" \
  -H "Authorization: Bearer <token>"
curl -s "http://127.0.0.1:3000/api/v1/branch-report/royalty-21-times?regDateFrom=2024-01-01&regDateTo=2030-12-31&channelType=all" \
  -H "Authorization: Bearer <token>"
```

(Channel Performance UI ใช้ royalty endpoint เดียวกัน)

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

หรือใช้ `./scripts/dev/smoke.sh` (คำนวณพอร์ตจาก `PORT_OFFSET` อัตโนมัติ)

---

## ทดสอบก่อน PR / CI

```bash
./scripts/ci/ci-all.sh                  # backend CI ×7 + frontend + docs + smoke
./scripts/ci/ci-all.sh --skip-install   # ข้าม npm ci (หลัง install ผ่านแล้วเท่านั้น)
./scripts/ci/ci-all.sh --skip-smoke     # ไม่ boot stack
./scripts/ci/ci-all.sh --with-frontend  # smoke รวม backoffice-next
./scripts/ci/ci-all.sh --only backend   # เฉพาะ phase ที่ต้องการ
```

Install รันผ่าน `backend/scripts/install-all-deps.sh` — ลบ `node_modules` ก่อน `npm ci` ต่อ package และ retry ครั้งเดียวถ้า extract ไม่ครบ (TD-012). ถ้ายัง flake:

```bash
rm -rf backend/*/node_modules backend/service/*/node_modules frontend/backoffice-next/node_modules
./scripts/ci/ci-all.sh --skip-smoke
```

อย่าใช้ `--skip-install` เป็นค่า default — จะบังตา install flake

Per-package: `npm run ci` ใน directory ของ service นั้น

### Redis / token_gen (CI vs manual E2E)

- **CI (PR gate):** GHA `ci-check` มี Redis service (`:6379`). Gateway `jwt-auth-token-gen.test.js` ครอบคลุม `GATEWAY_JWT_REJECTED` เมื่อ `token_gen` เก่า/หาย (mock Redis). Auth มี integration ที่ publish `token_gen` หลัง revoke
- **Manual harness E2E (ไม่บังคับใน PR CI):** `./scripts/ci/redis-revoke-gateway-e2e.sh` — ต้อง boot stack ก่อน (`./scripts/dev/dev-up.sh`); flow: login → `POST /internal/users/:id/sessions/revoke` (Bearer `AUTH_INTERNAL_SERVICE_SECRET`) → gateway `/api/v1/me` ด้วย access token เก่า → `401 GATEWAY_JWT_REJECTED` → re-login 200
- **GHA manual:** Actions → **CI Quality Gate** → **Run workflow** → job **Redis revoke gateway E2E (manual)** (workflow_dispatch only — ไม่ block PR)

### OWASP ZAP (optional DAST)

ไม่บล็อก CI. เมื่อต้องการ baseline:

```bash
./scripts/dev/dev-up.sh
# รัน ZAP baseline ต่อ http://127.0.0.1:3000 (หลังมี session/token ตาม coding-standard software-testing)
# เก็บรายงานเป็น artifact ใน docs/ หรือ CI workflow_dispatch — อย่าใส่ ZAP เป็น required gate จนกว่า noise จะควบคุมได้
```

---

## Observability (optional)

```bash
./scripts/dev/dev-obs-up.sh    # VictoriaLogs :9428, VictoriaMetrics :8428
./scripts/dev/dev-obs-down.sh
```

ดู query ตัวอย่าง: [docs/observability.md](./docs/observability.md)

---

## หลาย worktree (`PORT_OFFSET`)

```bash
# Instance หลัก
./scripts/dev/dev-up.sh

# Worktree อื่น — ไม่ชน port/DB
PORT_OFFSET=100 ./scripts/dev/dev-up.sh --with-frontend
PORT_OFFSET=100 ./scripts/dev/smoke.sh
PORT_OFFSET=100 ./scripts/dev/dev-down.sh
```

| ทรัพยากร | offset 0 | offset 100 |
|----------|----------|------------|
| gateway | :3000 | :3100 |
| auth | :3001 | :3101 |
| backoffice-next | :3005 | :3105 |
| Mongo DB | `zero-platform_0` | `zero-platform_100` |
| Runtime | `.dev-run/0/` | `.dev-run/100/` |

---

## Troubleshooting (สรุป)

| อาการ | วิธีแก้ |
|-------|---------|
| `:3005` เปิดไม่ได้ | รัน `./scripts/dev/dev-up.sh --with-frontend` หรือ `cd frontend/backoffice-next && npm run dev` |
| Login ไม่ผ่าน | ลอง `1234` · รัน `./scripts/dev/seed-all.sh` · ตรวจ `backend/auth/.env.harness` (`DATABASE_URI`) |
| 502 จาก Next.js rewrite | auth (:3001) หรือ gateway (:3000) ยังไม่รัน |
| 401 ที่ gateway | Token หมดอายุ / `token_gen` revoked — login ใหม่ |
| 403 ที่ upstream | `GATEWAY_SECRET` ไม่ตรงหรือสั้นกว่า 32 ตัว |
| `E11000 duplicate key` | username ซ้ำใน Mongo — re-seed หรือลบ user เก่า |
| `503 /readyz` | Redis ไม่ขึ้น — `cd backend && docker compose ps` |

รายละเอียด: [backend/RUNBOOK.md](./backend/RUNBOOK.md)

---

## Frontend verification

```bash
cd frontend/backoffice-next && npm run lint && npm test && npm run build
./scripts/dev/dev-up.sh --with-frontend && ./scripts/dev/smoke.sh
```

Audit checklist: [docs/exec-plans/completed/frontend-ui-audit-2026-07.md](./docs/exec-plans/completed/frontend-ui-audit-2026-07.md) (superseded by [COMPREHENSIVE-AUDIT](./frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md))

---

## Related

- [README.md](./README.md) — ภาพรวม repo
- [AGENTS.md](./AGENTS.md) — map สำหรับ agents
- [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md) — trust boundary, gateway mesh
