# Changelog

## [Unreleased]

### Changed

- **`loadEnv` (auth, gateway):** trim `TZ` from `.env.defaults` / `.env` before validation so Windows CRLF (`UTC\r`) no longer fails startup; normalize `process.env.TZ` to `UTC` at runtime.
- **Repository:** `.gitattributes` — force LF line endings on `*.env.defaults`.

## [0.1.6] - 2026-05-21

### Added

- `docs/domain.md` — business SoT (scope, RBAC, HTTP intent, sequences).
- `docs/db/erd.md` v1.0.1 — MongoDB schema/ERD/indexes; org std links, metadata/layer table, audit/Redis notes.
- `docs/adrs/001-fastify-esm.md` — ADR moved from package-root `docs/adr-001-fastify-esm.md`.
- `src/lib/request-id.js`, `src/lib/rate-limit.js` — `x-request-id` echo; per-route rate-limit buckets.

### Changed

- `docs/architecture.md` v1.4.1 — TOC/anchors, companion links, persistence index → `docs/db/erd.md`; reading guide sections 1–13.
- `docs/session-revoke-token-gen-changes.md` — metadata table.
- `README.md` — document map links (`ARCHITECTURE.md`, `_coding-standards`).
- `CHANGELOG.md` — `model-matrix.md` link (was broken `CODE_MATRIX_TARGET.md`).
- `init-db.mjs` — index comment points at `docs/db/erd.md`.
- Integration tests — `x-request-id` coverage on auth routes.

## [0.1.5] - 2026-05-15

- **Review fixes (O-16/D1):** Redis publish หลัง internal revoke — fail-closed **`503`** + **`AUTH_NOT_READY`** เมื่อ `SET` ล้มเหลวและ `REDIS_URL` ตั้ง (ไม่ warn-only)
- **`REDIS_URL`:** required เมื่อ **`NODE_ENV=production`**
- **Internal revoke:** `user_id` ไม่พบ → **`404`** + **`AUTH_USER_NOT_FOUND`** (registry + OpenAPI)
- **Tests:** `internal-revoke-redis.integration.test.js`, `env-redis-production.test.js`; unknown user + Redis paths
- **Docs/OpenAPI:** `architecture.md` v1.3.8 (O-16 implemented); `/readyz` รวม Redis; idempotency wording ชัด
- **Dev:** monorepo root `docker-compose.yml` (Redis 7) + `RUNBOOK.md` §2.5 local Redis guide

## [0.1.4] - 2026-05-14

- **OpenAPI:** รวมสัญญาเป็นฉบับเดียว — ลบ `docs/openapi.yaml`; SoT คือ [`openapi.yaml`](./openapi.yaml) เท่านั้น (`openapi-package-version-alignment` ตรวจแค่ไฟล์นี้กับ `package.json`)
- **CI:** script `ci:with-coverage` รัน merge gate แล้วตามด้วย `test:coverage` (แนว `_coding-standards/backend/ci.md` §4)
- **Supply chain:** `npm audit fix` — แก้ `fast-uri` (high) ผ่าน `npm run audit:check`
- **Code matrix ([`model-matrix.md`](../../../model-matrix.md)):** refresh token ไม่ถูกต้องหรือ reuse → Problem **`code`** **`TOKEN_REFRESH_REJECTED`** (แทน `TOKEN_REFRESH_INVALID` / `TOKEN_REFRESH_REUSED`).
- **D1 — Redis `token_gen` publish:** เมื่อตั้ง **`REDIS_URL`** — auth เชื่อม Redis ตอน startup; หลัง internal revoke สำเร็จ **`SET`** `user:{sub}:token_gen`; dependency **`GET /readyz`** รวม **`PING`** Redis; dependency **`redis`** package

## [0.1.3] - 2026-05-13

- **O-16 — session revoke + `token_gen`:** ฟิลด์ `access_token_gen` บน `auth_users`; claim **`token_gen`** ใน access JWT (login/refresh); **`POST /internal/users/{user_id}/sessions/revoke`** ด้วย **`AUTH_INTERNAL_SERVICE_SECRET`** (Bearer, constant-time); idempotent **200**; audit `auth.sessions_revoked_by_service`; OpenAPI + **`AUTH_INTERNAL_UNAUTHORIZED`** ใน `_coding-standards/auth/codes.yaml`
- **Migration:** `init-db` backfill `access_token_gen: 0` สำหรับผู้ใช้เดิม
- **Env:** `AUTH_INTERNAL_SERVICE_SECRET` (required) — ดู `.env.example`

## [0.1.2] - 2026-05-12

- **BREAKING (MongoDB):** collection names use the **`auth_*`** prefix (`auth_users`, `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events`) via `src/config/mongo-collections.js`. Databases created with the old names (`users`, `refresh_tokens`, …) require **renaming collections** (or re-init after backup) before the service can read data.

## [0.1.1] - 2026-05-11

- **Standards (สาย A):** Problem `code` สำหรับ validation body → **`AUTH_INVALID_REQUEST`**; readiness 503 → **`AUTH_NOT_READY`** + `type` **`…/not-ready`** (`_coding-standards/auth/codes.yaml` **1.0.1**)
- **Observability:** Pino **`redact`** ตาม `_coding-standards/backend/observability.md` §2.2 ใน `buildFastifyLoggerOptions`
- **Rate limit:** แยก bucket ต่อ route — login **30**/นาที, refresh **120**/นาที, logout **60**/นาที (`auth.route.js`); เอกสาร `docs/architecture.md` + `_coding-standards/auth/api.md`

## [0.1.0] - 2026-05-10

- Initial `auth` implementation aligned with `docs/architecture.md` (login, opaque refresh handling, access JWT RS256, rate limits, security constraints per SoT).
- Minimal `openapi.yaml` at package root and `.env.example`; scripts for dev env and seed data.
