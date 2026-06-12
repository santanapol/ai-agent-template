# Changelog

## [Unreleased]

### Added

- **`x-user-permissions`**: verify and inject user permissions claim as a comma-separated list of raw strings to upstream services (Phase G). Includes anti-spoofing header stripping and duplicate header guard.
- **Docs**: update `docs/architecture.md` (metadata, header contract table, and document version bumped to v1.5.0).

### Changed

- **`loadEnv`:** trim `TZ` before validation (Windows CRLF on `.env.defaults`); set `process.env.TZ` to `UTC` after load.

## [0.2.4] - 2026-05-21

### Added

- **`x-request-id`:** `genReqId` + response echo; upstream inject ใช้ `request.id` (`src/lib/request-id.js`)
- **CI:** `format` / `format:check` (Prettier); `spec:codes` (`GatewayProblem.code` ↔ `_coding-standards/gateway/codes.yaml`); test `routes.json` ↔ `routes.example.json` alignment; test `openapi.yaml` `info.version` ↔ `package.json`

### Changed

- **`loadEnv`:** `TZ` must be `UTC` (default `UTC`)
- **`openapi.yaml`:** `GatewayProblem.code` enum + shared `components/examples` (404/401/502/504) + `GET /api/v1/me` gateway error responses
- **`README.md`:** document map + local dev (compact tables, Scripts bullets); Redis / routes / troubleshooting; exclude from Prettier (`.prettierignore`)
- **Docs:** `README.md` document map, local routes ตรง `routes.json` (ลบ smart-report); `docs/architecture.md` v1.4.1 — `GATEWAY_CLAIM_REJECTED` → **401**, `model-matrix.md` link
- **`openapi.yaml`:** `info.title` → `gateway`; login `client_kind` enum `[native, web]` (aligned with auth)
- **`routes.json` / `routes.example.json`:** add **`/auth`** → auth `:3001`; sync staff / items / me

### Removed

- **`server.js`:** startup warn สำหรับ `/api/v1/reports` / smart-report (ไม่ใช้แล้ว)

## [0.2.3] - 2026-05-15

- **Review fixes (D3):** `REDIS_URL` **required** เมื่อ `NODE_ENV=production` (สอดคล้อง org `gateway/api.md`)
- **Tests:** Redis `get` throw → `401`; `readyz` 503 เมื่อ Redis `ping` fail; `env-redis-production.test.js`
- **CI:** `audit:check` ใน `npm run ci`
- **Docs/OpenAPI:** `architecture.md` v1.3.4 — prod MUST `REDIS_URL`; §10 rollout checklist

## [0.2.2] - 2026-05-14

- **D3 — `token_gen` at edge:** หลัง JWKS verify เทียบ JWT claim **`token_gen`** กับ Redis **`user:{sub}:token_gen`** (สัญญา auth D1) — stale / missing claim / Redis error (เมื่อ client เปิด) → **`401`** + **`GATEWAY_JWT_REJECTED`** (`jwt-auth.js`, `redis-token-gen.js`)
- **`REDIS_URL`:** optional — ว่างข้าม Redis check; ตั้งแล้ว connect + **`readyz`** ping Redis
- **Tests:** `test/lib/redis-token-gen.test.js`, `test/plugins/jwt-auth-token-gen.test.js`; proxy tests ใส่ `token_gen` ใน JWT
- **Docs:** `docs/architecture.md` v1.3.3 (§5, §7, §9, §11.5); `docs/session-revoke-token-gen-changes.md` → implemented

## [0.2.1] - 2026-05-13

- **Tenant claims at edge:** JWT ที่ proxy ต้องมี claim ที่แมปเป็น **`x-user-ou`** และ **`x-user-branch`** แบบ non-empty — ถ้าไม่ครบ → **`401`** + **`GATEWAY_CLAIM_REJECTED`** (`inject-context.js`) สอดคล้อง `_coding-standards/gateway/api.md` trusted headers **[Required]**
- **Upstream client `detail`:** ข้อความ **`GATEWAY_UPSTREAM_UNAVAILABLE`** ไม่ใส่ path workspace / ชื่อ demo service — ย้ายไป `src/lib/upstream-problem-detail.js`
- **Proxy header merge:** trusted headers **ทับ** inbound หลัง strip (`register-proxies.js`) เพื่อทนต่อการขยาย whitelist
- **CI:** `npm run ci` รวม **`spec:lint`**
- **Docs:** **`openapi.yaml`** ที่ root แพ็กเกจ (ย้ายจาก `docs/openapi.yaml`) — ลิงก์ normative ของ `/auth/*` ชี้ไป **`auth/openapi.yaml`** (ฉบับเดียวหลังรวม spec ที่ `auth`)
- **Docs:** `docs/architecture.md` — แก้ §4 / §12.2 ให้ตรง behavior 401 claim validation; §7 หมายเหตุ **`GATEWAY_ROUTE_NOT_CONFIGURED`** กับ startup fail-fast; §9 readyz `routes`; §14 PR gates; bump doc **1.3.2**
- **HTTP / registry alignment ([`model-matrix.md`](../../../model-matrix.md)):** Problem **`GATEWAY_CLAIM_REJECTED`** ใช้ **HTTP 401** (เดิม 400) ใน `src/lib/gateway-problems.js` + อัปเดต `docs/architecture.md` §7 · JWT verify ล้มเหลว → **`GATEWAY_JWT_REJECTED`** (รวมเคสเดิม `GATEWAY_JWT_INVALID` / `GATEWAY_JWT_EXPIRED`) ใน `jwt-auth.js` / `inject-context.js`
- **Observability:** Pino **`redact`** ใน `buildFastifyLoggerOptions` ตาม `_coding-standards/backend/observability.md` §2.2 (ผ่าน `gateway/README.md`)
- **Process:** `uncaughtException` / `unhandledRejection` → log fatal + `process.exit(1)` ใน `src/server.js`
- **Routing (Approach A):** `setNotFoundHandler` → **404** สำหรับ path ที่ไม่ match proxy routes; เอกสาร §7 + `_coding-standards/gateway/api.md` แยก **404** vs **`GATEWAY_ROUTE_NOT_CONFIGURED`**
- **ADR:** [`docs/adrs/001-gateway-esm-fastify.md`](./docs/adrs/001-gateway-esm-fastify.md) + [`README.md`](./README.md) ชี้ SoT/ADR; [`ARCHITECTURE.md`](../../ARCHITECTURE.md) อ้าง ADR ใน companion table
- **OpenAPI:** `docs/openapi.yaml` → **OpenAPI 3.1.0**; `npm run ci` (`lint` + `test`)

## [0.2.0] - 2026-05-12

- **Breaking:** ลบ `GET /health` — ใช้ **`GET /healthz`** (liveness) และ **`GET /readyz`** (readiness: ตรวจ JWKS) แทน สอดคล้อง `_coding-standards/gateway/api.md`
- **Breaking:** ข้อผิดพลาดขอบ gateway (JWT / claim / upstream ที่ gateway map / readiness ล้มเหลว) ตอบ **`application/problem+json`** พร้อม **`code`** ตาม `_coding-standards/gateway/codes.yaml`
- Runtime: **`engines.node`** เป็น **`>=24 <25`**, เพิ่ม **`packageManager`**, **`.npmrc`** (`engine-strict=true`), `start`/`dev`/`test` ใช้ **`TZ=UTC`** และ **`--enable-source-maps`** ที่ entrypoint
- Env: **`PROBLEM_TYPE_BASE`**, **`READY_CHECK_TIMEOUT_MS`** (defaults ใน `src/config/env.js`)
- Docs: อัปเดต `docs/architecture.md`, `ARCHITECTURE.md`, `docs/openapi.yaml`

## [0.1.1] - 2026-05-11

- Hardening: `GATEWAY_SECRET` must be at least 32 characters (`src/config/env.js`).
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only (`src/app.js`).
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII) (`src/plugins/jwt-auth.js`).
- Docs: deploy JWT/env checklist in [RUNBOOK](../RUNBOOK.md#deploy-jwt-env); OpenAPI description links to it.

## [0.1.0] - 2026-05-10

- Initial `gateway` implementation aligned with `docs/architecture.md` (JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown).
- Minimal `docs/openapi.yaml` (`GET /health`, SoT links, Bearer JWT described for proxied routes).
