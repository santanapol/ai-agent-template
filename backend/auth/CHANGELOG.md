# Changelog

## [Unreleased]

### Security

- **`constantTimeSecretEqual`** (`src/lib/internal-bearer.js`): กำจัด early-return บน `a.length !== b.length` ก่อนเรียก `timingSafeEqual` — ช่องโหว่ timing side-channel รั่วความยาว `AUTH_INTERNAL_SERVICE_SECRET` ออกไปได้; แก้โดย pad ทั้ง 2 buffers ให้ยาวเท่ากันก่อน compare เสมอ
- **Redis `token_gen` TTL** (`publishTokenGenOrNotReady`): แก้ TTL จาก `REFRESH_TOKEN_TTL_SECONDS` เป็น `REFRESH_TOKEN_TTL_SECONDS + ACCESS_TOKEN_TTL_SECONDS` — ป้องกัน revocation bypass window ที่เกิดขึ้นเมื่อ Redis key หมดอายุก่อน access JWT ตัวสุดท้ายที่ออกไปแล้ว
- **`refreshBodySchema`** (`src/modules/auth/auth.validator.js`): `additionalProperties: false` (เดิมเป็น `true`) — ปิดช่องส่ง property แปลกผ่าน refresh body

### Changed

- **`setPasswordByService`** (`auth.service.js`): ย้าย `findUserById` ออกมาก่อน transaction (pre-read `preUser`) — กำจัด read-your-writes hazard บน replica set ที่เกิดจากการเรียก `findUserById` ภายใน `runUserTransaction` โดยไม่มี session
- **`assertAccessTokenGenMatches`**: คืน `{ ok: true, user }` แทน `{ ok: true }` — `changeOwnPassword` ใช้ `genCheck.user` ตัดรอบ DB อีก 1 ครั้ง
- **`recordFailures`**: parallelise ด้วย `Promise.all` — IP key กับ user key อัปเดตพร้อมกัน
- **`refresh()`**: เพิ่ม audit + IP throttle เมื่อ user ถูกลบไปแล้ว (`reason: user_not_found`); ใช้ `runUserTransaction` โดยตรงแทน inline transaction
- **`audit()` catch**: log `{ err, event_type }` แทน `err` เพียงอย่างเดียว — ops เห็นว่า event_type ไหนล้มเหลว
- **ESLint** (`eslint.config.js`): เพิ่ม `eslint-plugin-security` (detect-eval, non-literal-regexp, non-literal-fs-filename เป็น error; detect-possible-timing-attacks เป็น warn); exclude `scripts/**`; override test files ปิด `detect-non-literal-fs-filename`

### Added

- **Dynamic Permission in DB (Approach B)** — สิทธิ์เมนู/Action ดึงจาก MongoDB แทนตาราง static (ดู `_mission-control/SPEC.md`):
  - **`auth_menus` / `auth_role_permissions`** (`src/config/mongo-collections.js`): ผังเมนูกลาง (hierarchy ผ่าน `parent_key`/`sort_order`/`type` ลึกสุด 3 ระดับ) + role mappings ต่อคู่ `(ou_id, role)` พร้อม unique indexes
  - **Tenant scoping intentionally OU-only** (no `branch_id`): permissions are OU-level data by design; branch-level overrides deferred to future use case (ดู `_mission-control/ROADMAP.md`)
  - **`src/lib/permission-match.js`**: Permission Matching Contract — exact key หรือ wildcard `domain:*` (จุด match กลางจุดเดียว; gateway/upstream ต้อง implement ตรงกัน); no mid-string or bare wildcards
  - **เคลม `permissions` ใน Access JWT + response body ของ login/refresh** (`auth.service.js`, `lib/jwt-access.js`): resolve สดจาก DB ทุกครั้งที่ออก token — fallback `(ou_id, role)` → `(null, role)` → `[]` (deny by default); ค่าดิบไม่ expand wildcard เพื่อคุมขนาด token; DB error = login ล้ม (ไม่กลืนเป็น `[]`)
  - **`GET /auth/me/menus`** (`auth.route.js`): โครงเมนูเฉพาะที่ผู้ใช้มีสิทธิ์ — expand wildcard + เติมโหนดบรรพบุรุษถึง root, flat list เรียง (depth, `sort_order`), Bearer + `token_gen` check, rate limit 60/min; cycle detection raises error (gateway/service will return 500)
  - **`scripts/seed-permissions.js`** + `scripts/seed-data/permissions.js`: seed/sync แบบ idempotent — validate 7 กฎก่อนเขียนเสมอ (fail ทั้งสคริปต์เมื่อผิด), upsert พร้อม audit fields, `--prune` ลบส่วนเกินพร้อมรายงาน; ข้อ 7 วาลิเดต wildcard match ≥1 action (fail on zero-match wildcard)
  - **env `ACCESS_JWT_SOFT_LIMIT_BYTES`** (default 4096): warning log เมื่อ access JWT บวมเกิน soft limit — remedy is data-layer: use wildcard ไม่ expand; if truly unavoidable, extract claim from DB instead of JWT (future option, designed-in)
  - **Tests**: `permission-match.test.js`, `permission-resolution.test.js`, `permission-repository.integration.test.js`, `jwt-permissions.test.js`, `seed-permissions.test.js`, `me-menus.integration.test.js` (+38 tests)
- **`PATCH /internal/users/{user_id}/role`** (`src/modules/internal/internal.route.js`): เพิ่ม internal endpoint สำหรับให้ trusted service อัปเดตบทบาทของผู้ใช้แบบ Atomic operation ใน MongoDB transaction พร้อมทำ session revocation
- **Tests**: integration test `internal-set-role.integration.test.js` สำหรับตรวจสิทธิ์การเข้าใช้งาน การอัปเดตบทบาท และการยกเลิก session
- **`InternalService`** (`src/modules/internal/internal.service.js`): thin delegation wrapper ระหว่าง `InternalController` กับ `AuthService` — รักษา module boundary
- **Tests**: unit tests TTL `EX` option ใน `redis-access-token-gen.test.js` (EX > 0 และ EX = 0); integration mock `createMockRedis` capture `opts` + assert `{ EX: 87300 }` ใน `internal-revoke-redis.integration.test.js`

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
