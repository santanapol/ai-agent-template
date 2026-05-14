# Release Readiness Checklist (MVP)

## Scope Covered

- **members-api** (`PORT` **3004**): branch-scoped members CRUD at **`/api/v1/members`** (tenant from gateway **`x-user-*`** headers); **`GET /healthz`**, **`GET /readyz`**.
- **crud-service** (`.demo/crud-service/`, `PORT` **3003**): **`GET /api/v1/me`**, **`/api/v1/items`** CRUD, **`GET /metrics`**, health/readiness.
- **gateway**: longest-prefix table — **`/api/v1/members`** → members-api; **`/api/v1/items`** and **`/api/v1/me`** → **crud-service** on :3003 ([`gateway/routes.json`](../../gateway/routes.json)).
- Frontend (`www/app`): **Members** + **OU Settings**; guards + Playwright e2e aligned to this scope.

## QA Checklist

- [x] Role matrix e2e covers **Members** read vs manage and **OU Settings** access (owner/admin vs others).
- [x] Tenant scope checks block cross-OU and cross-branch where required (`ScopeGuard` / `RoleGuard`).
- [x] Frontend lint, unit tests, build, and Playwright **`npm run ci`** pass.
- [x] **crud-service** and **members-api** **`npm test`** pass; OpenAPI Spectral passes (warnings on unused components in crud-service optional to clean up later).

## Time Metrics Verification

- [x] Automated p95 harness in **crud-service** covers **`GET /api/v1/me`**, items list, and error paths (`slo-latency.test.js`).

## Release Notes (Draft)

### Added

- **`services/members`** (members API): members service (flat **`/api/v1/members`**) with Mongo + same mesh middleware pattern as **crud-service**.
- Gateway route **`/api/v1/members`** → upstream **3004**.

### Changed

- **crud-service** (under `.demo/`; formerly **reference** / **demo-crud-service**): removed **`members`**, **`billing`**, **`dashboard`** modules; OpenAPI paths trimmed accordingly.
- **Frontend**: removed Dashboard, Items, Billing, Reports routes and features; default branch home → **Members**; **`useMembers`** calls **`/api/v1/members`**.

### Risks / Follow-ups

- Local dev requires **three** Node services for full API: **gateway**, **crud-service** (run from `.demo/crud-service/`), **members-api** (+ auth + Vite as before).
- E2e stubs **`/api/v1/members`** so UI tests do not require members-api running; integration tests against a live stack remain a separate checklist if needed.
