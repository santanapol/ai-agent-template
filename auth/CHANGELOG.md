# Changelog

## [Unreleased]

_(none)_

## 0.1.5

- **Review fixes (O-16/D1):** Redis publish หลัง internal revoke — fail-closed **`503`** + **`AUTH_NOT_READY`** เมื่อ `SET` ล้มเหลวและ `REDIS_URL` ตั้ง (ไม่ warn-only)
- **`REDIS_URL`:** required เมื่อ **`NODE_ENV=production`**
- **Internal revoke:** `user_id` ไม่พบ → **`404`** + **`AUTH_USER_NOT_FOUND`** (registry + OpenAPI)
- **Tests:** `internal-revoke-redis.integration.test.js`, `env-redis-production.test.js`; unknown user + Redis paths
- **Docs/OpenAPI:** `architecture.md` v1.3.8 (O-16 implemented); `/readyz` รวม Redis; idempotency wording ชัด
- **Dev:** monorepo root `docker-compose.yml` (Redis 7) + `RUNBOOK.md` §2.5 local Redis guide

## 0.1.4

- **OpenAPI:** รวมสัญญาเป็นฉบับเดียว — ลบ `docs/openapi.yaml`; SoT คือ [`openapi.yaml`](./openapi.yaml) เท่านั้น (`openapi-package-version-alignment` ตรวจแค่ไฟล์นี้กับ `package.json`)
- **CI:** script `ci:with-coverage` รัน merge gate แล้วตามด้วย `test:coverage` (แนว `_coding-standards/backend/ci.md` §4)
- **Supply chain:** `npm audit fix` — แก้ `fast-uri` (high) ผ่าน `npm run audit:check`
- **Code matrix ([`CODE_MATRIX_TARGET.md`](../../../CODE_MATRIX_TARGET.md)):** refresh token ไม่ถูกต้องหรือ reuse → Problem **`code`** **`TOKEN_REFRESH_REJECTED`** (แทน `TOKEN_REFRESH_INVALID` / `TOKEN_REFRESH_REUSED`).
- **D1 — Redis `token_gen` publish:** เมื่อตั้ง **`REDIS_URL`** — auth เชื่อม Redis ตอน startup; หลัง internal revoke สำเร็จ **`SET`** `user:{sub}:token_gen`; dependency **`GET /readyz`** รวม **`PING`** Redis; dependency **`redis`** package

## 0.1.3

- **O-16 — session revoke + `token_gen`:** ฟิลด์ `access_token_gen` บน `auth_users`; claim **`token_gen`** ใน access JWT (login/refresh); **`POST /internal/users/{user_id}/sessions/revoke`** ด้วย **`AUTH_INTERNAL_SERVICE_SECRET`** (Bearer, constant-time); idempotent **200**; audit `auth.sessions_revoked_by_service`; OpenAPI + **`AUTH_INTERNAL_UNAUTHORIZED`** ใน `_coding-standards/auth/codes.yaml`
- **Migration:** `init-db` backfill `access_token_gen: 0` สำหรับผู้ใช้เดิม
- **Env:** `AUTH_INTERNAL_SERVICE_SECRET` (required) — ดู `.env.example`

## 0.1.2

- **BREAKING (MongoDB):** collection names use the **`auth_*`** prefix (`auth_users`, `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events`) via `src/config/mongo-collections.js`. Databases created with the old names (`users`, `refresh_tokens`, …) require **renaming collections** (or re-init after backup) before the service can read data.

## 0.1.1

- **Standards (สาย A):** Problem `code` สำหรับ validation body → **`AUTH_INVALID_REQUEST`**; readiness 503 → **`AUTH_NOT_READY`** + `type` **`…/not-ready`** (`_coding-standards/auth/codes.yaml` **1.0.1**)
- **Observability:** Pino **`redact`** ตาม `_coding-standards/backend/observability.md` §2.2 ใน `buildFastifyLoggerOptions`
- **Rate limit:** แยก bucket ต่อ route — login **30**/นาที, refresh **120**/นาที, logout **60**/นาที (`auth.route.js`); เอกสาร `docs/architecture.md` + `_coding-standards/auth/api.md`

## 0.1.0

- Initial `auth` implementation aligned with `docs/architecture.md` (login, opaque refresh handling, access JWT RS256, rate limits, security constraints per SoT).
- Minimal `openapi.yaml` at package root and `.env.example`; scripts for dev env and seed data.
