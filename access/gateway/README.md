# gateway

API Gateway (Fastify, ESM): verify JWT (JWKS), inject trusted headers, proxy ตาม `ROUTES_JSON` / `ROUTES_FILE`

## SoT / ADR

| เอกสาร | Role |
| :--- | :--- |
| [`docs/architecture.md`](./docs/architecture.md) | **Production SoT** — contract, env, errors, security (นับเป็น **ADR** ตาม `_coding-standards/gateway/runtime.md`) |
| [`docs/adrs/001-gateway-esm-fastify.md`](./docs/adrs/001-gateway-esm-fastify.md) | ADR ชั้น service: ESM + Jest + อ้างอิง SoT ด้านบน |
| [`ARCHITECTURE.md`](../../ARCHITECTURE.md) | Trust boundary / overview |

## Org standards

- [`_coding-standards/gateway`](../../_coding-standards/gateway/README.md) — edge codes, API contract, runtime

## Scripts

- `npm run dev` — local
- `npm test` / `npm run lint` / `npm run ci` — quality gates

## Local multi-upstream (smart-report + reference)

Default [`.env.example`](./.env.example) / [`routes.example.json`](./routes.example.json) registers upstream **prefixes** (longest match wins — see [`src/config/routes.js`](./src/config/routes.js)):

| Prefix (on gateway host) | Default upstream | Service in this monorepo |
|---------------------------|------------------|---------------------------|
| `/api/v1/reports` | `http://127.0.0.1:3000` | [`smart-report`](../../../smart-report/) (workspace sibling) |
| `/api/v1/items` | `http://127.0.0.1:3003` | [`reference`](../reference/) (`GATEWAY_SHARED_SECRET` must match gateway `GATEWAY_SECRET`) |
| `/api` | `http://127.0.0.1:3003` | Same **reference** upstream — catch-all for paths such as **`/api/v1/me`** (not under `items` / `reports`) |

If **`GET /api/v1/reports`** (via gateway) returns **`404`** with upstream body **`NO_MATCHING_API_PATH`**, the request is hitting **reference**, which has no that path — your **`ROUTES_JSON` / `ROUTES_FILE`** is missing the **longer** prefix for smart-report.

Ensure **`/api/v1/items`** and **`/api/v1/reports`** are listed **before** the catch-all **`/api`** entry.

- **SoT values:** copy from [`.env.example`](./.env.example) or use committed [`routes.example.json`](./routes.example.json) with `ROUTES_FILE=./routes.example.json` (and clear `ROUTES_JSON` per env rules).

Restart **gateway** after changing routes.

### `ROUTES_JSON` in `.env` seems ignored

Node’s [`--env-file`](https://nodejs.org/api/cli.html#--env-fileconfig) does **not** override variables that are **already set in your shell**. If you previously `export ROUTES_JSON='[{"prefix":"/api",...}]'`, that value would normally win over the line in `.env`.

**Mitigation (gateway `server.js`):** on startup, **`ROUTES_JSON` / `ROUTES_FILE` are re-read from `gateway/.env`** (path resolved from the package, not `process.cwd()`) and written to `process.env`, so the **route table follows the service `.env` file** even when a stale `ROUTES_JSON` is exported in the shell or when the shell cwd is not `access/gateway/`. You can still `unset ROUTES_JSON` if you prefer not to rely on this.

- On startup the process prints **`[gateway] Effective proxy prefixes:`** — confirm `/api/v1/reports` appears before `/api` when smart-report is in use.
