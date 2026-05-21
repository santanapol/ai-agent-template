# Release Readiness Checklist (MVP)

## Scope Covered

- **crud-service** (`.demo/crud-service/`, `PORT` **3003**): **`GET /api/v1/me`**, **`/api/v1/items`** CRUD, **`GET /metrics`**, health/readiness.
- **gateway**: longest-prefix table — **`/api/v1/items`** and **`/api/v1/me`** → **crud-service** on :3003 ([`gateway/routes.json`](../../gateway/routes.json)).
- Frontend (`www/app`): **Members** + **OU Settings**; guards + Playwright e2e aligned to this scope (Members API calls stubbed in e2e — **`services/members`** removed from monorepo).

## QA Checklist

- [x] Role matrix e2e covers **Members** read vs manage and **OU Settings** access (owner/admin vs others).
- [x] Tenant scope checks block cross-OU and cross-branch where required (`ScopeGuard` / `RoleGuard`).
- [x] Frontend lint, unit tests, build, and Playwright **`npm run ci`** pass.
- [x] **crud-service** **`npm test`** pass; OpenAPI Spectral passes (warnings on unused components in crud-service optional to clean up later).

## Time Metrics Verification

- [x] Automated p95 harness in **crud-service** covers **`GET /api/v1/me`**, items list, and error paths (`slo-latency.test.js`).

## Release Notes (Draft)

### Added

- (none in this delta)

### Changed

- **Removed** **`services/members`** (members-api) and gateway route **`/api/v1/members`** → :3004.
- **crud-service** (under `.demo/`; formerly **reference** / **demo-crud-service**): removed **`members`**, **`billing`**, **`dashboard`** modules; OpenAPI paths trimmed accordingly.
- **Frontend**: removed Dashboard, Items, Billing, Reports routes and features; default branch home → **Members**; **`useMembers`** calls **`/api/v1/members`** (stubbed in e2e until a replacement backend exists).

### Risks / Follow-ups

- Local dev for API: **gateway** + **crud-service** (run from `.demo/crud-service/`) + **auth** + Vite as before — no separate members-api process.
- E2e stubs **`/api/v1/members`** so UI tests do not require a live members backend; integration tests against a live stack remain a separate checklist if needed.
