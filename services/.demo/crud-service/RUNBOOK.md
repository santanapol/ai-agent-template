# crud-service Runbook

ปฏิบัติการรันและดูแล **`crud-service`** (local / production). Document map: [README.md](./README.md).

**Package root:** `zero-platform/services/.demo/crud-service/` — คำสั่ง `npm` / `pm2` รันจากโฟลเดอร์นี้

## Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Development](#development)
4. [Production](#production)
5. [Health checks](#health-checks)
6. [API contract](#api-contract)
7. [Smoke tests](#smoke-tests) (direct mesh + [gateway E2E](#smoke-ผ่าน-gateway-e2e))
8. [HTTP errors](#http-errors)
9. [Troubleshooting](#troubleshooting)
10. [Pre-merge](#pre-merge)
11. [Production handoff](#production-handoff)
12. [Notes](#notes)

## Overview

| Item | Value |
| :--- | :--- |
| Service | `crud-service` |
| Node | `>=24 <25` |
| Database | MongoDB `api_example` — [docs/db/erd.md](./docs/db/erd.md) |
| Port | **`3003`** default (`PORT`) — [local-ports.md](../../../local-ports.md) |
| Dev | `npm run dev` |
| Prod | PM2 [`ecosystem.config.cjs`](./ecosystem.config.cjs) |

**SoT:** [openapi.yaml](./openapi.yaml) · [docs/architecture.md](./docs/architecture.md) · org [`_coding-standards/backend`](../../../../../_coding-standards/backend/README.md)

**Gateway (local):** prefixes `/api/v1/items`, `/api/v1/me` → `:3003` — [gateway routes.json](../../../gateway/routes.json); `GATEWAY_SHARED_SECRET` = gateway `GATEWAY_SECRET`

## Configuration

```bash
cp .env.example .env
```

| Variable | Notes |
| :--- | :--- |
| `PORT` | Default **`3003`** — ปรับ `curl` ด้านล่างถ้าเปลี่ยน |
| `DB_NAME` | `api_example` |
| `MONGODB_URI` | user/password + `authSource` ถูกต้อง |
| `GATEWAY_SHARED_SECRET` | ตรง `x-gateway-secret` จาก gateway |

**`.env` load:** `src/config/load-local-env.js` — เติมเฉพาะคีย์ที่ยังไม่มีใน `process.env` (PM2/systemd/shell ชนะ). Production: secret ผ่าน platform env; ถ้าใช้ไฟล์บน server → `chmod 600`, ห้าม commit

## Development

```bash
npm ci
npm run dev
```

**Quality (ชุดเดียวกับ CI):** `npm run ci`

**เร็ว:** `npm run lint` · `npm test` · `npm run format:check` · `npm run format` (แก้รูปแบบ)

หลังขึ้น: [Health checks](#health-checks)

## Production

`ecosystem.config.cjs` — `NODE_ENV=production`, `TZ=UTC`

```bash
npm ci --omit=dev
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs crud-service
```

**Deploy (package root on server)**

| Change | Commands |
| :--- | :--- |
| `package.json` / lock | `git pull --ff-only` → `npm ci --omit=dev` → `pm2 startOrReload ecosystem.config.cjs --update-env` |
| Code only | `git pull --ff-only` → `pm2 startOrReload ecosystem.config.cjs --update-env` |

**PM2:** `pm2 restart|stop|delete crud-service`

**Without PM2:** `NODE_ENV=production npm start` (หลังตั้ง env)

## Health checks

ไม่ต้อง `x-gateway-secret` บน `/healthz`, `/readyz` (แทน `3003` ด้วย `PORT` จริง)

| Check | Command | Expected |
| :--- | :--- | :--- |
| Liveness | `curl -s http://127.0.0.1:3003/healthz` | `200` |
| Readiness | `curl -s http://127.0.0.1:3003/readyz` | `200` (Mongo ping OK) |
| Readiness fail | same | `503` + `SERVICE_UNAVAILABLE` |

## API contract

**Mesh `/api/v1/*` (CRUD + `GET /api/v1/me`)**

- `x-gateway-secret`, `x-user-id`, `x-user-ou`, `x-user-branch`
- `x-user-role` — optional (สะท้อนใน `/api/v1/me`)

**`Accept`:** ถ้าส่ง ต้องมี `application/json` หรือ `*/*` — ไม่เช่นนั้น `400` + `INVALID_HEADER`

**Concurrency:** `POST` → `ETag` + `Location`; `PATCH`/`PUT`/`DELETE` → `If-Match` (ดู org tenant-audit / [ADR 001](./docs/adrs/001-put-full-replace.md))

**`GET /metrics`:** **`x-gateway-secret` เท่านั้น** — Prometheus text (ไม่ผ่าน `/api/v1` stack)

## Smoke tests

Direct mesh (`BASE_URL` default `http://127.0.0.1:3003`):

```bash
BASE_URL="http://127.0.0.1:3003"
GW_SECRET="replace-me"   # = GATEWAY_SHARED_SECRET

COMMON_HEADERS=(
  -H "accept: application/json"
  -H "x-gateway-secret: ${GW_SECRET}"
  -H "x-user-id: user-001"
  -H "x-user-ou: ou-001"
  -H "x-user-branch: bkk-01"
)
```

**Quick**

```bash
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/me"
curl -i -H "x-gateway-secret: ${GW_SECRET}" "${BASE_URL}/metrics"
```

**Items CRUD (ลำดับแนะนำ):** list → create (เก็บ `Location`/`ETag`) → get → patch (`If-Match`) → delete (`If-Match` ล่าสุด)

```bash
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/items"

curl -i "${COMMON_HEADERS[@]}" -H "content-type: application/json" \
  -d '{"code":"ITEM-900","name":"Runbook Item","description":null,"status":"active","tags":[]}' \
  "${BASE_URL}/api/v1/items"

# แทน <itemId> / ETag จาก response ก่อนหน้า
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/items/<itemId>"
curl -i "${COMMON_HEADERS[@]}" -H "content-type: application/json" \
  -H 'if-match: W/"<etag>"' -X PATCH -d '{"name":"Updated"}' \
  "${BASE_URL}/api/v1/items/<itemId>"
curl -i "${COMMON_HEADERS[@]}" -H 'if-match: W/"<latest-etag>"' -X DELETE \
  "${BASE_URL}/api/v1/items/<itemId>"
```

### Smoke ผ่าน gateway (E2E)

Client ยิง **gateway** (`:3002`) ด้วย **`Authorization: Bearer`** — gateway verify JWT (JWKS) แล้ว inject mesh headers ไป **crud-service** (`:3003`). ไม่ส่ง `x-gateway-secret` จาก client

**ก่อนเริ่ม**

| Check | Command / action |
| :--- | :--- |
| User ตัวอย่าง | ที่ `auth`: `npm run seed:example` (ถ้ายังไม่มี) — user `demo` / password ตาม stdout |
| Secret คู่กัน | `GATEWAY_SHARED_SECRET` (crud) = `GATEWAY_SECRET` (gateway) — template เดียวกัน |
| Redis (แนะนำ) | [RUNBOOK §2.5](../../../RUNBOOK.md#25--redis-local--token_gen--immediate-revoke) — `REDIS_URL` ใน auth + gateway |
| Routes | [gateway `routes.json`](../../../gateway/routes.json) มี `/api/v1/me` และ `/api/v1/items` → `:3003` |

**Terminal layout**

| # | Service | Cwd | Command | Port |
| :---: | :--- | :--- | :--- | :---: |
| 1 | auth | `zero-platform/auth` | `npm run dev` | 3001 |
| 2 | crud-service | `services/.demo/crud-service` | `npm run dev` | 3003 |
| 3 | gateway | `zero-platform/gateway` | `npm start` | 3002 |
| 4 | smoke | `zero-platform/gateway` | `npm run try:proxy` | — |

**Pre-flight (ทุกตัวต้อง `200`)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/healthz   # auth
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3003/healthz   # crud-service
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/healthz   # gateway
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3003/readyz    # Mongo ready
```

**อัตโนมัติ (แนะนำ)** — จาก `gateway/`:

```bash
# default: login → GET /api/v1/me
npm run try:proxy

# ทด items list ผ่าน gateway
TRY_PROXY_PATH=/api/v1/items npm run try:proxy
```

Env (optional): `TRY_AUTH_URL`, `TRY_GATEWAY_URL`, `TRY_PROXY_PATH`, `TRY_LOGIN_USERNAME`, `TRY_LOGIN_PASSWORD` — ดู [gateway `.env.example`](../../../gateway/.env.example)

**Manual `curl`**

```bash
AUTH=http://127.0.0.1:3001
GW=http://127.0.0.1:3002

# 1) Login (native JSON) — แก้ user/password ตาม seed
LOGIN=$(curl -s -X POST "${AUTH}/auth/login" \
  -H 'content-type: application/json' \
  -d '{"username":"demo","password":"DevExample-demo-1","client_kind":"native"}')
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
# หรือใช้ jq: TOKEN=$(echo "$LOGIN" | jq -r .access_token)

test -n "$TOKEN" || { echo "login failed: $LOGIN"; exit 1; }

# 2) Profile ผ่าน gateway (trusted headers inject ที่ edge)
curl -i "${GW}/api/v1/me" \
  -H "authorization: Bearer ${TOKEN}" \
  -H 'accept: application/json'

# 3) Items list ผ่าน gateway
curl -i "${GW}/api/v1/items" \
  -H "authorization: Bearer ${TOKEN}" \
  -H 'accept: application/json'
```

**ผลที่คาดหวัง:** `GET /api/v1/me` → `200` + JSON profile; `GET /api/v1/items` → `200` + envelope (อาจ `data: []` ถ้ายังไม่มี item — ดู [Troubleshooting](#troubleshooting))

**ถ้าล้ม**

| HTTP | สาเหตุที่พบบ่อย |
| :--- | :--- |
| `401` ที่ gateway | JWT/JWKS/`token_gen`+Redis — `JWT_JWKS_URL` ชี้ auth; ลอง login ใหม่ |
| `502` / `504` | crud-service ไม่ขึ้น หรือ `ROUTES_JSON` ไม่มี prefix — ดู log `[gateway] Effective proxy prefixes:` |
| `401` / `403` ที่ upstream (หลัง proxy) | แปลก — client ไม่ควรยิง `:3003` โดยตรงใน flow นี้; ตรวจ gateway inject headers |

Monorepo E2E เต็ม (auth + Redis + หลาย upstream): [RUNBOOK.md](../../../RUNBOOK.md)

## HTTP errors

| HTTP | `code` | Cause (short) |
| :--- | :--- | :--- |
| 400 | `INVALID_HEADER` | `Accept` / duplicate headers |
| 401 | `GATEWAY_SECRET_REJECTED` | `x-gateway-secret` |
| 403 | `MISSING_GATEWAY_USER_CONTEXT` | missing `x-user-*` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | body not JSON |
| 412 | `VERSION_CONFLICT` | bad `If-Match` |
| 428 | `PRECONDITION_REQUIRED` | no `If-Match` on mutating |
| 429 | (rate limit) | quota exceeded |
| 503 | `SERVICE_UNAVAILABLE` | Mongo down |

Full registry: `openapi.yaml`, [codes.yaml](./codes.yaml), org `backend/codes.yaml`

## Troubleshooting

| Symptom | Check |
| :--- | :--- |
| `/readyz` 503 | Mongo up; `MONGODB_URI` / `DB_NAME` / `authSource` |
| CRUD 401/403 | headers; `GATEWAY_SHARED_SECRET` |
| PATCH/DELETE 412 | fresh `ETag` from `GET` |
| 429 | rate window; writes stricter than reads |
| `items` empty `data: []` | DB = `DB_NAME`; collection `items`; `x-user-ou` / `x-user-branch` hex24 ตรงเอกสาร |
| `MODULE_NOT_FOUND` | `npm ci` at package root; `pino` present; prod ใช้ `NODE_ENV=production` + PM2 |

## Pre-merge

```bash
npm run ci
```

Optional: `npm run lint` · `npm test` · `npm run format:check` · `npm run spec:lint`

## Production handoff

### Before deploy

- [ ] `npm run ci` (หรือ `lint` + `test` + `format:check` + `spec:lint` ตามทีม)
- [ ] `openapi.yaml` ↔ implementation
- [ ] indexes ตาม [docs/db/erd.md](./docs/db/erd.md)
- [ ] `package.json` version (ถ้าทีม bump release)

### Deploy

- [ ] code + env (`MONGODB_URI`, `GATEWAY_SHARED_SECRET`, …)
- [ ] [Production](#production) (`npm ci --omit=dev` เมื่อ lock เปลี่ยน)
- [ ] `RATE_LIMIT_STORE` (Redis) ถ้าหลาย instance
- [ ] gateway ถึง `PORT` ได้

### After deploy

- [ ] `/healthz` + `/readyz` = `200`
- [ ] logs ไม่ error ตอน boot
- [ ] smoke: `/api/v1/me` + `/api/v1/items` ([Smoke tests](#smoke-tests))

## Notes

- ห้าม log `MONGODB_URI` เต็ม / `GATEWAY_SHARED_SECRET`
- index changes → audit ใน `docs/db/erd.md`
- PM2 name: `crud-service`
