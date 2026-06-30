# gateway

API Gateway (Fastify, ESM) for the `zero-platform` monorepo — verify JWT (JWKS), optional **`token_gen`** gate (Redis), inject trusted headers, proxy ตาม `ROUTES_JSON` / `ROUTES_FILE`.

| Read | Role |
| :--- | :--- |
| [docs/architecture.md](./docs/architecture.md) | **Technical SoT** — contract, env, errors, routing |
| [openapi.yaml](./openapi.yaml) | **HTTP Contract** (`spec:lint`, `spec:codes`) |
| [docs/session-revoke-token-gen-changes.md](./docs/session-revoke-token-gen-changes.md) | **Checklist** — D3 `token_gen` + Redis (implemented) |
| [docs/adrs/001-gateway-esm-fastify.md](./docs/adrs/001-gateway-esm-fastify.md) | **ADR 001** — Fastify + ESM exception |
| [../../ARCHITECTURE.md](../../ARCHITECTURE.md) | System architecture / trust boundary |
| [../local-ports.md](../local-ports.md) | Local dev port index |
| [../RUNBOOK.md](../RUNBOOK.md) | Monorepo ops — Redis §2.5, deploy JWT/env |
| [`_coding-standards/gateway`](../../../_coding-standards/gateway/README.md) | Org gateway edge standard |

## Scripts

- `npm run dev` / `npm start` — local (`--env-file=.env`, `TZ=UTC`)
- `npm test` / `npm run ci` — quality gates (lint, format, Spectral, `spec:codes`, audit)
- `npm run spec:lint` / `npm run spec:codes` — OpenAPI + problem `code` registry
- `npm run dev:upstream` / `npm run try:proxy` — proxy smoke (see `.env.example`)

## Quick start

1. `cp .env.example .env` — `JWT_JWKS_URL`, `GATEWAY_SECRET`, routes (§ Proxy routes)
2. (แนะนำ) [Redis](#redis-local--token_gen--immediate-revoke) สำหรับ `token_gen`
3. รัน **auth** (:3001) + upstream + **gateway** (:3000) — [local-ports.md](../local-ports.md)
4. `npm run try:proxy`

## Local development

### Proxy routes

SoT: [`routes.json`](./routes.json), [`.env.example`](./.env.example) (`ROUTES_JSON`), หรือ [`routes.example.json`](./routes.example.json) (`ROUTES_FILE`) — **longest prefix wins** ([`src/config/routes.js`](./src/config/routes.js)). ตั้ง **อย่างใดอย่างหนึ่ง** ระหว่าง `ROUTES_JSON` กับ `ROUTES_FILE`.

| Prefix | Upstream | Service |
| :--- | :--- | :--- |
| `/api/v1/items` | `:3002` | [demo-service](../services/.demo/demo-service/) |
| `/api/v1/me` | `:3002` | Same **demo-service** |
| `/api/v1/staff` | `:3101` | [staff](../service/staff/) |
| `/api/v1/smart-reports` | `:3103` | [smart-report](../service/smart-report/) |
| `/api/v1/branch-report` | `:3015` | [branch-report](../service/branch-report/) |

Host เต็มใน `routes.json` (`http://127.0.0.1:…`). Prefix ที่เฉพาะกว่า **ก่อน** prefix สั้นกว่า.

- **`GATEWAY_SECRET`:** ตรง `GATEWAY_SHARED_SECRET` ของ upstream (`x-gateway-secret`)

### Redis (local — `token_gen` / immediate revoke)

`auth` + gateway ใช้ Redis key **`user:{sub}:token_gen`** ร่วมกัน

```bash
cd ..   # zero-platform root
docker compose up -d redis
docker compose exec redis redis-cli ping   # PONG
```

`REDIS_URL=redis://127.0.0.1:6379/0` ใน **ทั้ง** `auth/.env` และ `gateway/.env` — [RUNBOOK §2.5](../RUNBOOK.md#25--redis-local--token_gen--immediate-revoke)

- **Local (แนะนำ):** ตั้ง URL → ตรวจ `token_gen` หลัง JWKS (immediate revoke)
- **Local (minimal):** ว่าง → ข้าม `token_gen` (ไม่ทดสอบ revoke)
- **Production:** `REDIS_URL` บังคับ (Joi) — [architecture.md §5](./docs/architecture.md)

### Smoke

`npm run try:proxy` หลัง auth + upstream + gateway ขึ้นแล้ว (terminal layout ใน `.env.example`)

## Troubleshooting

### `ROUTES_JSON` in `.env` seems ignored

[`--env-file`](https://nodejs.org/api/cli.html#--env-fileconfig) **ไม่** override ตัวแปรที่ export ใน shell แล้ว

**Mitigation (`server.js`):** อ่าน `ROUTES_JSON` / `ROUTES_FILE` จาก `gateway/.env` (package root) แล้วเขียนกลับ `process.env`

- Log **`[gateway] Effective proxy prefixes:`** ต้องตรง `routes.json` / `.env`
- หรือ `unset ROUTES_JSON` ใน shell
