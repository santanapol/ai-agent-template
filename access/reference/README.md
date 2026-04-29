# reference

Reference internal API: **`GET /api/v1/me`** (trusted gateway headers) plus CRUD on **`items`** using MongoDB, tenant headers, and std.min envelope patterns.

- **Direct to this service:** [`openapi.yaml`](./openapi.yaml) (port **3003**; mesh + `x-user-*` ตาม spec)
- **Through `gateway` (Bearer JWT อย่างเดียว):** [`docs/openapi-via-gateway.yaml`](./docs/openapi-via-gateway.yaml) (พอร์ต gateway ตัวอย่าง **3002**)

**In the `access-platform` monorepo:** the default `gateway` route table sends **`/api/v1/items`** and the catch-all **`/api`** (e.g. **`/api/v1/me`**) → this service at **`http://127.0.0.1:3003`** — set **`GATEWAY_SHARED_SECRET`** in `.env` to match **`GATEWAY_SECRET`** in `gateway/.env` (see [`../gateway/.env.example`](../gateway/.env.example)).

## Where this code lives

- **This repository (clone):** work from the repository root. Setup commands below assume your shell is already at that root.
- **Inside the [ai-agent](https://github.com/santanapol/ai-agent-cursor) workspace:** the same project is usually at `project-active/access-platform/access/reference/` from that workspace root (`cd` there before the `cp` / `npm` steps).

## Runbook

- Operational guide: [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)

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

Default listen port in this repo is **`3003`** (monorepo: หลีก `smart-report` ที่ 3000; เปลี่ยน `PORT` ใน `.env` ได้) — หลังรันทดสอบ **`GET /healthz`** (และ **`GET /readyz`** เมื่อ DB พร้อม)

## Quality checks

```bash
npm run ci       # format:check + lint + spec:lint + test + audit:check
npm run spec:lint # Spectral — `.spectral.yaml` extends `../../_coding-standards/spectral/org-api.yaml`
```

**Observability:** **`GET /metrics`** (Prometheus text) requires **`x-gateway-secret`** (same mesh secret as CRUD routes).

## Required headers on CRUD

- `x-gateway-secret`
- `x-user-id`
- `x-user-ou`
- `x-user-branch`

## Endpoints

- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/items`
- `POST /api/v1/items`
- `GET /api/v1/items/:itemId`
- `PUT /api/v1/items/:itemId`
- `PATCH /api/v1/items/:itemId`
- `DELETE /api/v1/items/:itemId`

## PM2

```bash
pm2 start ecosystem.config.cjs
pm2 logs
```
