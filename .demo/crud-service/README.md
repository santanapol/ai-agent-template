# crud-service

Sample internal API: **`GET /api/v1/me`** (trusted gateway headers) plus CRUD on **`items`** using MongoDB, tenant headers, and std.min envelope patterns.

Package path in this monorepo: **`.demo/crud-service/`** (demo / teaching code).

- **Direct to this service:** [`openapi.yaml`](./openapi.yaml) (port **3003**; mesh + `x-user-*` ตาม spec)
- **Architecture (service SoT):** [`docs/architecture.md`](./docs/architecture.md) (trust boundary, persistence, ERD)
- **MongoDB (ERD, data dictionary, indexes, ops):** [`docs/db/erd.md`](./docs/db/erd.md)
- **ADRs (package decisions):** [`docs/adrs/`](./docs/adrs/) — e.g. [`001-put-full-replace.md`](./docs/adrs/001-put-full-replace.md) (`PUT` semantics on `items`)
- **Through `gateway` (Bearer JWT อย่างเดียว):** [`openapi-via-gateway.yaml`](./openapi-via-gateway.yaml) (พอร์ต gateway ตัวอย่าง **3002**)

**In the `access-platform` monorepo:** the default `gateway` route table sends **`/api/v1/items`** and the catch-all **`/api`** (e.g. **`/api/v1/me`**) → this service at **`http://127.0.0.1:3003`** — set **`GATEWAY_SHARED_SECRET`** in `.env` to match **`GATEWAY_SECRET`** in `gateway/.env` (see [`../../gateway/.env.example`](../../gateway/.env.example)).

## Where this code lives

- **This repository (clone):** `cd` to **`.demo/crud-service/`** from the monorepo root.
- **Inside the [ai-agent](https://github.com/santanapol/ai-agent-cursor) workspace:** usually `project-active/access-platform/.demo/crud-service/`.

## Source layout (`src/`)

- **Domain / HTTP modules:** only **`src/modules/items/`** and **`src/modules/me/`** (no other `src/modules/*` in this package).
- **Observability:** **`src/observability/`** — Prometheus registry, HTTP metrics middleware, latency-report helper; tests live under **`src/observability/tests/`** (`unit-test` / `integration-test`).

Shared wiring stays outside those folders (for example **`src/app.js`**, **`src/config/`**, **`src/middlewares/`**, **`src/utils/`**).

## Runbook

- Operational guide: [`RUNBOOK.md`](./RUNBOOK.md)

## Prerequisites

- Node `>=24 <25` (see `package.json` `engines`)
- MongoDB reachable with database `api_example` — connection string and options are in [`.env.example`](./.env.example)

Development logs use **`pino-pretty`** (readable lines) when `NODE_ENV` is not `production` or `test`. Set **`LOG_PRETTY=false`** in `.env` if you prefer raw JSON.

## Setup

```bash
cp .env.example .env
# Edit .env: MONGODB_URI, GATEWAY_SHARED_SECRET, etc.
npm ci
npm run dev
```

Default listen port in this repo is **`3003`** (monorepo: หลีก `smart-report` ที่ 3000; เปลี่ยน `PORT` ใน `.env` ได้). เมื่อ **`npm run dev`** (หรือ process อื่นที่ bind `PORT`) listen แล้ว ลอง **`GET /healthz`**; **`GET /readyz`** ควร success เมื่อ MongoDB พร้อมและ connection ใช้งานได้

## Quality checks

```bash
npm run ci       # format:check + lint + spec:lint + test + audit:check
npm run spec:lint # Spectral — `.spectral.yaml` extends `../../../../_coding-standards/spectral/org-api.yaml`
```

**Observability:** **`GET /metrics`** (Prometheus text) requires **`x-gateway-secret`** (same mesh secret as **`/api/v1/*`**).

## Required headers on `/api/v1/*` (including `me` and CRUD)

- `x-gateway-secret`
- `x-user-id`
- `x-user-ou`
- `x-user-branch`

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /metrics` (Prometheus text; requires `x-gateway-secret`)
- `GET /api/v1/me`
- `GET /api/v1/items`
- `POST /api/v1/items`
- `GET /api/v1/items/:itemId`
- `PUT /api/v1/items/:itemId`
- `PATCH /api/v1/items/:itemId`
- `DELETE /api/v1/items/:itemId`

## PM2

Process definition: [`ecosystem.config.cjs`](./ecosystem.config.cjs) (package root).

```bash
pm2 start ecosystem.config.cjs
pm2 logs
```
