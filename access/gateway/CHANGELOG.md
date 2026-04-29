# Changelog

## 0.2.1

- **HTTP / registry alignment ([`CODE_MATRIX_TARGET.md`](../../../CODE_MATRIX_TARGET.md)):** Problem **`GATEWAY_CLAIM_REJECTED`** ใช้ **HTTP 401** (เดิม 400) ใน `src/lib/gateway-problems.js` + อัปเดต `docs/architecture.md` §7 · JWT verify ล้มเหลว → **`GATEWAY_JWT_REJECTED`** (รวมเคสเดิม `GATEWAY_JWT_INVALID` / `GATEWAY_JWT_EXPIRED`) ใน `jwt-auth.js` / `inject-context.js`
- **Observability:** Pino **`redact`** ใน `buildFastifyLoggerOptions` ตาม `_coding-standards/backend/observability.md` §2.2 (ผ่าน `gateway/README.md`)
- **Process:** `uncaughtException` / `unhandledRejection` → log fatal + `process.exit(1)` ใน `src/server.js`
- **Routing (Approach A):** `setNotFoundHandler` → **404** สำหรับ path ที่ไม่ match proxy routes; เอกสาร §7 + `_coding-standards/gateway/api.md` แยก **404** vs **`GATEWAY_ROUTE_NOT_CONFIGURED`**
- **ADR:** [`docs/adrs/001-gateway-esm-fastify.md`](./docs/adrs/001-gateway-esm-fastify.md) + [`README.md`](./README.md) ชี้ SoT/ADR; [`ARCHITECTURE.md`](../../ARCHITECTURE.md) อ้าง ADR ใน companion table
- **OpenAPI:** `docs/openapi.yaml` → **OpenAPI 3.1.0**; `npm run ci` (`lint` + `test`)

## 0.2.0

- **Breaking:** ลบ `GET /health` — ใช้ **`GET /healthz`** (liveness) และ **`GET /readyz`** (readiness: ตรวจ JWKS) แทน สอดคล้อง `_coding-standards/gateway/api.md`
- **Breaking:** ข้อผิดพลาดขอบ gateway (JWT / claim / upstream ที่ gateway map / readiness ล้มเหลว) ตอบ **`application/problem+json`** พร้อม **`code`** ตาม `_coding-standards/gateway/codes.yaml`
- Runtime: **`engines.node`** เป็น **`>=24 <25`**, เพิ่ม **`packageManager`**, **`.npmrc`** (`engine-strict=true`), `start`/`dev`/`test` ใช้ **`TZ=UTC`** และ **`--enable-source-maps`** ที่ entrypoint
- Env: **`PROBLEM_TYPE_BASE`**, **`READY_CHECK_TIMEOUT_MS`** (defaults ใน `src/config/env.js`)
- Docs: อัปเดต `docs/architecture.md`, `ARCHITECTURE.md`, `docs/openapi.yaml`

## 0.1.1

- Hardening: `GATEWAY_SECRET` must be at least 32 characters (`src/config/env.js`).
- Security: default error handler no longer forwards raw `Error` objects to clients for non-proxy failures; server logs full error only (`src/app.js`).
- Observability: on JWT verify failure, log at `debug` with `jwtVerifyFailedCode` (no token / no PII) (`src/plugins/jwt-auth.js`).
- Docs: deploy JWT/env checklist in [RUNBOOK](../RUNBOOK.md#deploy-jwt-env); OpenAPI description links to it.

## 0.1.0

- Initial `gateway` implementation aligned with `docs/architecture.md` (JWKS verify, header contract, prefix proxy routes, `/health`, graceful shutdown).
- Minimal `docs/openapi.yaml` (`GET /health`, SoT links, Bearer JWT described for proxied routes).
