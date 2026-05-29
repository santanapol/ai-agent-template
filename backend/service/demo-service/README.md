# demo-service

Sample internal API (Express) for `zero-platform` — **`GET /api/v1/me`** (trusted gateway headers) and **items** CRUD (MongoDB, tenant scope, std.min envelope).

Path: **`services/.demo/demo-service/`** (demo / teaching).

| Read | Role |
| :--- | :--- |
| [docs/architecture.md](./docs/architecture.md) | **Technical SoT** — trust boundary, HTTP, persistence |
| [docs/db/erd.md](./docs/db/erd.md) | **Database** — ERD, data dictionary, indexes |
| [openapi.yaml](./openapi.yaml) | **HTTP Contract** — direct mesh (`:3003`, `x-user-*`) |
| [openapi-via-gateway.yaml](./openapi-via-gateway.yaml) | **Public client** — Bearer JWT via gateway (`:3002`) |
| [docs/adrs/001-put-full-replace.md](./docs/adrs/001-put-full-replace.md) | **ADR 001** — `PUT` full replace on `items` |
| [docs/bruno/](./docs/bruno/) | **Optional** — Bruno collections (direct + via gateway) |
| [RUNBOOK.md](./RUNBOOK.md) | Ops — setup, smoke, troubleshooting |
| [../../../local-ports.md](../../../local-ports.md) | Monorepo port index |
| [../../../gateway/README.md](../../../gateway/README.md) | Gateway routes + `GATEWAY_SECRET` |
| [`_coding-standards/backend`](../../../../../_coding-standards/backend/README.md) | Org backend mesh standard |
| [codes.yaml](./codes.yaml) | Service error code snapshot |

## Scripts

- `npm run dev` / `npm start` — local (`TZ=UTC`, port **3003** default)
- `npm run init:db` — สร้าง indexes บน `items` (ครั้งแรก / หลังสร้าง DB ใหม่)
- `npm run seed:example` — ใส่ items ตัวอย่าง 3 รายการ (dev); ใช้ `SEED_OU_ID` / `SEED_BRANCH_ID` ให้ตรง auth seed สำหรับ gateway E2E
- `npm test` / `npm run ci` — quality gates (lint, format, Spectral, audit)
- `npm run spec:lint` — `openapi.yaml` + `openapi-via-gateway.yaml`
- `npm run test:integration:mongo` — Mongo integration subset

## Quick start

1. `cp .env.example .env` — `MONGODB_URI`, `GATEWAY_SHARED_SECRET` (ตรง [gateway `.env`](../../../gateway/.env.example))
2. `npm ci` → `npm run init:db` → `npm run seed:example` (หลัง Mongo พร้อม)
3. `npm run dev`
4. `GET /healthz` — liveness; `GET /readyz` เมื่อ Mongo พร้อม

Dev logs: **pino-pretty** เมื่อ `NODE_ENV` ไม่ใช่ `production` / `test` (`LOG_PRETTY=false` สำหรับ JSON)

## Gateway (local)

Default [gateway `routes.json`](../../../gateway/routes.json) → this service at **`http://127.0.0.1:3003`**:

| Prefix | Notes |
| :--- | :--- |
| `/api/v1/items` | Items CRUD |
| `/api/v1/me` | Profile from trusted headers |

`GATEWAY_SHARED_SECRET` ใน `.env` **ต้องตรง** `GATEWAY_SECRET` บน gateway

## Mesh (`/api/v1/*`)

- `x-gateway-secret`, `x-user-id`, `x-user-ou`, `x-user-branch` (CRUD + `/api/v1/me`)
- `GET /metrics` — `x-gateway-secret` เท่านั้น (ดู [RUNBOOK.md](./RUNBOOK.md))

## Endpoints

| Group | Paths |
| :--- | :--- |
| Ops | `GET /healthz`, `GET /readyz`, `GET /metrics` |
| API | `GET /api/v1/me` |
| Items | `GET/POST /api/v1/items`, `GET/PUT/PATCH/DELETE /api/v1/items/:itemId` |

## Source layout

- **Modules:** `src/modules/items/`, `src/modules/me/` only
- **Observability:** `src/observability/` (+ tests under `observability/tests/`)
- **Wiring:** `src/app.js`, `src/config/`, `src/middlewares/`, `src/utils/`

## PM2

[`ecosystem.config.cjs`](./ecosystem.config.cjs) — `pm2 start ecosystem.config.cjs`

## E2E via gateway

Step-by-step: [RUNBOOK.md § Smoke ผ่าน gateway](./RUNBOOK.md#smoke-ผ่าน-gateway-e2e) — `npm run try:proxy` จาก `gateway/`
