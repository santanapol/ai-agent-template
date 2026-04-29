# Changelog

## [Unreleased]

- **Code matrix ([`CODE_MATRIX_TARGET.md`](../../../CODE_MATRIX_TARGET.md)):** refresh token ไม่ถูกต้องหรือ reuse → Problem **`code`** **`TOKEN_REFRESH_REJECTED`** (แทน `TOKEN_REFRESH_INVALID` / `TOKEN_REFRESH_REUSED`).

## 0.1.2

- **BREAKING (MongoDB):** collection names use the **`auth_*`** prefix (`auth_users`, `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events`) via `src/config/mongo-collections.js`. Databases created with the old names (`users`, `refresh_tokens`, …) require **renaming collections** (or re-init after backup) before the service can read data.

## 0.1.1

- **Standards (สาย A):** Problem `code` สำหรับ validation body → **`AUTH_INVALID_REQUEST`**; readiness 503 → **`AUTH_NOT_READY`** + `type` **`…/not-ready`** (`_coding-standards/auth/codes.yaml` **1.0.1**)
- **Observability:** Pino **`redact`** ตาม `_coding-standards/backend/observability.md` §2.2 ใน `buildFastifyLoggerOptions`
- **Rate limit:** แยก bucket ต่อ route — login **30**/นาที, refresh **120**/นาที, logout **60**/นาที (`auth.route.js`); เอกสาร `docs/architecture.md` + `_coding-standards/auth/api.md`

## 0.1.0

- Initial `auth` implementation aligned with `docs/architecture.md` (login, opaque refresh handling, access JWT RS256, rate limits, security constraints per SoT).
- Minimal `docs/openapi.yaml` and `.env.example`; scripts for dev env and seed data.
