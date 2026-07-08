# Environment files — อ่านไฟล์นี้ก่อน

> **กฎเดียวจำง่าย:** `.env.example` = เอกสาร · `.env.harness` = harness (`dev-up`) · `.env` = manual · `.env.prod` = PM2 production · `.env.staging` = PM2 staging

---

## เลือก workflow ของคุณ

| วิธีรัน | ไฟล์ที่ process โหลดจริง | สร้างยังไง |
|---------|--------------------------|------------|
| **Harness** `./scripts/dev/dev-up.sh` | `backend/<service>/.env.harness` | `dev-up` refresh จาก `.env.harness.example` |
| **Manual** `npm run dev` | `backend/<service>/.env` | `cp .env.example .env` หรือ auth: `npm run create-env` |
| **Production** PM2 | `backend/<service>/.env.prod` | `cp .env.example .env.prod` บน prod server |
| **Staging** PM2 | `backend/<service>/.env.staging` | `./scripts/staging/staging-init-env.sh` แล้วแก้บน staging server |
| **Tests / CI** | `.env.test` → copy เป็น `.env` | `scripts/ci/ci-all.sh` |
| **Frontend** Next.js | `frontend/backoffice-next/.env.local` | `cp .env.local.example .env.local` |
| **Frontend staging build** | `frontend/backoffice-next/.env.staging` | `cp .env.staging.example .env.staging` |

ตรวจสถานะ: `node scripts/ci/env-status.mjs`

---

## `.env.harness` (harness)

```
.env.harness.example  (commit, localhost template)
        ↓  dev-up refreshes PORT/DB/routes only
.env.harness          (gitignore — แก้ Atlas/read URI ที่นี่)
        ↓
node --env-file=.env.harness
```

- **แก้ secret / Atlas:** แก้ `backend/<service>/.env.harness` โดยตรง
- **dev-up ทับไหม:** เฉพาะ key dynamic (PORT, DATABASE_URI, ROUTES_JSON, …) — `MONGODB_URI_READ` คงอยู่
- **PORT_OFFSET≠0:** ใช้ `.dev-run/<offset>/harness/*.env.harness` แทน (หลาย instance)

---

## แต่ละชื่อไฟล์

| ไฟล์ | ใน Git? | ใช้เมื่อ |
|------|:-------:|----------|
| `.env.example` | ✅ | template ทั่วไป |
| `.env.harness.example` | ✅ | template harness |
| `.env.staging.example` | ✅ | template frontend staging build |
| `.env.harness` | ❌ | `dev-up` |
| `.env` | ❌ | manual `npm run dev` |
| `.env.prod` | ❌ | PM2 **production** server |
| `.env.staging` | ❌ | PM2 **staging** server |
| `.env.test` | ✅ | CI |
| `.dev-run/<n>/` | ❌ | `logs/`, `pids/` เท่านั้น (พอร์ตคำนวณจาก `PORT_OFFSET` ใน `dev-lib.sh`) |

---

## PM2 deploy

| Environment | Ecosystem config | Env file per service |
|-------------|------------------|----------------------|
| **Production** | [`ecosystem.config.js`](./ecosystem.config.js) | `.env.prod` |
| **Staging** | [`ecosystem.staging.config.js`](./ecosystem.staging.config.js) | `.env.staging` |

```bash
# production
pm2 start backend/ecosystem.config.js

# staging
pm2 start backend/ecosystem.staging.config.js
```

Staging bootstrap: [server-environment/staging/RUNBOOK.md](../server-environment/staging/RUNBOOK.md)

---

## ชื่อตัวแปรมาตรฐาน

| บทบาท | ชื่อ | ใช้ที่ |
|-------|------|--------|
| Primary MongoDB | `MONGODB_URI` + `DB_NAME` | staff, demo, agent-invoice, smart-report |
| Auth primary | `DATABASE_URI` | auth |
| Read replica | `MONGODB_URI_READ` + `MONGODB_DB_BRANCH` | auth, agent-invoice, branch-report, smart-report |
| Upstream mesh | `GATEWAY_SHARED_SECRET` | internal services |
| Gateway edge | `GATEWAY_SECRET` | gateway |

---

## Database name mapping

**กฎ:** Staging และ Production ใช้ชื่อเดียวกัน · Harness = ชื่อ production + `_` + `PORT_OFFSET`

| Service | Harness (`PORT_OFFSET=0`) | Staging / Production |
|---------|---------------------------|---------------------|
| auth | `zero-platform_0` | `zero-platform` |
| staff | `zero-platform_0` (shared กับ auth) | `zero-platform` |
| agent-invoice | `zero-agent-invoice_0` | `zero-agent-invoice` |
| smart-report | `zero-smart-report_0` | `zero-smart-report` |
| demo-service | `demo-service_0` | `demo-service` |

หมายเหตุ:

- Service ที่มี `DB_NAME`: path ใน `MONGODB_URI` ต้องตรงกับ `DB_NAME` เสมอ
- `PORT_OFFSET=100` → `zero-platform_100`, `zero-agent-invoice_100`, …
- Read DB names (`gpp_777ww`, `gpp_org_data`) เหมือนกันทุก environment — **แต่ URI ต่างกันได้ตามเครื่อง**

### branch-report read DB (`MONGODB_URI_READ` / `MONGODB_DB_BRANCH`)

| โหมด | `MONGODB_URI_READ` | Seed (`seed-example-data.mjs` / `seed-all`) | ใช้เมื่อ |
|------|-------------------|---------------------------------------------|---------|
| **Local harness** | `mongodb://127.0.0.1:27017` (ดู `.env.harness.example`) | เขียนข้อมูล minimal ลง `gpp_777ww` | ต้องการ domain API (invite-links / royalty-21 / Channel Performance) |
| **Atlas demo** | `mongodb+srv://…` (read-only) | **ข้าม** — log `Skip branch-report seed — … remote/read-only` แล้ว exit 0 | รันอ่านข้อมูลจริงผ่าน service ได้ แต่ไม่ seed/เขียน |

Local: ต้องมี Mongo ว่างบนเครื่อง + ตั้ง harness ตาม example แล้วรัน `./scripts/dev/seed-all.sh`. อย่าชี้ seed ไป Atlas (script กันไว้แล้ว). `dev-up` ไม่ทับ `MONGODB_URI_READ` ใน `.env.harness` ที่มีอยู่ — ถ้ายังเป็น Atlas ให้แก้เองเป็น localhost เมื่อต้องการ seed.

---

## อย่าทำ

- ❌ commit `.env`, `.env.harness`, `.env.prod`, `.env.staging`
- ❌ ใช้ `.env.prod` บน staging (ใช้ `.env.staging` แทน — คนละ secret กับ prod)
- ❌ ใส่ production password ใน `.env.example` / `.env.harness.example`
- ❌ ใช้ `npm run create-env` บน production หรือ staging
