---
status: complete
created: 2026-07-08
updated: 2026-07-08
parent-plan: backend-review-plan-2026-07-08.md
services: [auth, gateway, demo-service, staff, agent-invoice, smart-report, branch-report]
---

# Backend Review Findings — 2026-07-08

> **Status:** Complete (review round) — [backend-review-plan-2026-07-08.md](../completed/backend-review-plan-2026-07-08.md) Phases 0–6 (plan archived).
> **Review round** — in-tree fixes this round: TD-010, BE-002, auth `*.schema.js`, earlier gateway Spectral + branch-report CI gates.
> **Residual fixes** continue outside this findings doc (TD-012 closed 2026-07-08; TD-011 / fleet health / seed docs in progress).

## Executive summary

| Axis | Verdict | Notes |
|------|---------|-------|
| CI (`ci-all --only backend`) | **pass** | Post-fix run (2026-07-08): `--skip-install` exit 0, all 7 + shared green (~82s); staff 218/218, demo 30/30, 0 skip. Prior canonical install run exit 1 (BE-001). See Appendix B. |
| coding-standard compliance | **improved** | Fleet health in `routes/health.route.js`; agent-invoice mesh plugins; smart-report OpenAPI skeleton + Spectral; auth `*.schema.js`; gateway Spectral fail-severity; branch-report format/audit |
| Integration truth (staff/demo Mongo) | **pass** | `.env.test` in GHA/ci-all; staff `init:db` before test; staff 218/218, demo 30/30, 0 documented skip (TD-010 fixed) |
| API runtime (harness + smoke) | **pass** | `dev-up` + `seed-all` + `smoke.sh` exit 0 (2026-07-08). Spot-checks via gateway `:3000`: `/api/v1/me`, `/auth/me/branches`, staff profiles (HQ vs 777WW), invoices, smart-reports; mesh without secret → `401 GATEWAY_SECRET_REJECTED`. BUG-01: **backend OK → frontend**. See Phase 3 evidence below. |
| Adversarial / security | **pass** | Phase 4 checklist green (mesh secret, spoof role, duplicate headers, IDOR staff, If-Match, revoke+Redis). agent-invoice missing `x-user-home-branch` duplicate guard → **BE-002 fixed**. ZAP deferred. See Appendix E. |
| Spec/OpenAPI drift | **partial** | smart-report (no OpenAPI, prose oracle only — TD-011); demo-service (no central spec — README/spec:lint/headers fixed); others have oracles + gates but `spec:consistency` ≠ runtime proof |

**Overall verdict:** **GO with caveats** — harness, CI, mesh/authZ, and Phase 3–4 API/adversarial checks pass. Residuals closed/mitigated 2026-07-08 follow-up: TD-012 install harden, TD-011 OpenAPI skeleton, fleet health extract, branch-report seed docs, agent-invoice mesh plugins. ZAP still optional (RUNBOOK).

### Counts (update as findings land)

| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 open review P2 — BE-001/TD-012 + TD-011 closed in residual fix pass; BE-002 fixed earlier |
| Pass / no issue | Phase 4 checklist all pass (see Appendix E) |

### Phase 0 — Top gaps per service (summary)

| Service | Top gaps |
|---------|----------|
| **auth** | ~~Uses `*.validator.js` not `*.schema.js`~~ — **renamed to `*.schema.js` (2026-07-08)**; duplicate-header code is `AUTH_INVALID_REQUEST` (auth zone, not `INVALID_HEADER`); no mesh secret (expected — public + internal bearer) |
| **gateway** | ~~`spec:lint` lacks `--fail-severity=error`~~ — **fixed earlier 2026-07-08**; no `modules/` layout (expected for proxy service) |
| **demo-service** | ~~No central spec~~; ~~`spec:lint` not in `ci`~~; ~~integration skips without `MONGODB_URI` (TD-010)~~; ~~README says "Express"~~; ~~duplicate-header omits `x-user-role` / `x-user-permissions`~~ — **fixed 2026-07-08** (TD-010, spec:lint, README, headers); no central spec remains |
| **staff** | ~~TD-010: CI may skip without Mongo~~ — **fixed 2026-07-08** (`.env.test` + `init:db` in ci). Reference-compliant plugins, layers, OpenAPI gates. |
| **agent-invoice** | Mesh/header guards **inline in `app.js`** (not shared plugins); uses inline Fastify logger vs `loggerInstance`/pino pattern; no `spec:codes` gate; ~~missing `x-user-home-branch` in dup list~~ — **BE-002 fixed** |
| **smart-report** | OpenAPI skeleton + `spec:lint` added 2026-07-08 (TD-011 closed); remaining CRUD paths still prose in technical-architecture |
| **branch-report** | ~~No `format:check` or `audit:check` in CI~~ — **fixed earlier 2026-07-08**; plugin naming differs (`gateway-auth` vs `gateway-secret`); `routes/` for health outside `modules/` (accepted) |
| **shared** | `platform-roles` is canonical roles SoT; only `npm test` — no spectral/consistency (library, n/a) |

---

## Per-service status

| Service | Phase 0 oracle | Phase 1 CI | Phase 2 integration | Phase 3 API | Phase 4 bug hunt | Notes |
|---------|----------------|------------|---------------------|-------------|------------------|-------|
| auth | done | **pass** (193) | | **pass** (login + active-branch + branches) | **pass** (revoke → gateway 401) | `*.validator.js` → `*.schema.js` done; native login needs `refresh_token` body for active-branch |
| gateway | done | **pass** (76) | | **pass** (proxy me/staff/invoices/smart-reports) | **pass** (spoof strip, dup header, token_gen) | Smoke + Phase 4 through `:3000` |
| demo-service | done | **pass** (30, 0 skip) | **pass** (30, 0 skip) | **pass** (`GET /api/v1/me`) | **pass** (mesh secret) | Covered by smoke `/api/v1/me` |
| staff | done | **pass** (218, 0 skip) | **pass** (218, 0 skip) | **pass** (BUG-01: HQ 2 / 777WW 3) | **pass** (IDOR 404, If-Match 428/412) | Backend list OK; empty UI → frontend (**fixed** `ab81416`) |
| agent-invoice | done | **pass** (47) | | **pass** (invoices + agents list) | **pass** (+ BE-002 fix) | Seeded `IV-202607-001`; home-branch dup guard added |
| smart-report | done | **pass** (160) | | **pass** (list total 4) | **partial** (mesh + RBAC; sandbox deep skip) | curl only; no OpenAPI (TD-011) |
| branch-report | done | **pass** (77) | | skipped (seed skipped; read-only Atlas URI) | **pass** (mesh secret only) | Domain routes not data-exercised |
| shared (ecosystem.factory) | done | **pass** (3) | | n/a | n/a | |

---

## Bug findings

| ID | Sev | Service | Title | Repro | Expected | Actual | Owner | Fix PR |
|----|-----|---------|-------|-------|----------|--------|-------|--------|
| BE-001 | P2 | harness | Local `npm ci` leaves corrupt `node_modules` | `./scripts/ci/ci-all.sh --only backend --skip-smoke` (2026-07-08, Node v24.15.0) | All 7 `npm run ci` exit 0 | First run exit 1: TAR_ENTRY_ERROR / missing eslint, spectral, fastify, mongodb | infra | (open — TD-012) |
| BE-002 | P2 | agent-invoice | Duplicate-header list omitted `x-user-home-branch` | Dual `x-user-home-branch` on `/api/v1/*` | `400 INVALID_HEADER` | Prior: not rejected (header not in `CRITICAL_HEADERS`; Array-only check missed wire dupes under inject) | backend | **fixed in-tree** 2026-07-08 — add header + `rawHeaders` count via `lib/critical-headers.js` + unit tests |

---

## Systemic gaps (candidate tech debt)

| ID | Description | Confirmed? | Action |
|----|-------------|------------|--------|
| TD-010 | staff/demo `.env.test` missing from CI matrix — integration passes via skip placeholders | **fixed** (2026-07-08) | `.env.test` + GHA/ci-all matrix; staff `init:db` in ci |
| TD-011 | smart-report missing OpenAPI + `spec:lint` | **confirmed** (Phase 0/5) | Defer epic — tracked in `tech-debt-tracker.md` |
| TD-012 | Local sequential `npm ci` can corrupt `node_modules` (BE-001) | **confirmed** (Phase 1) | Investigate npm/tar flake; until then prefer `--skip-install` after known-good deps |

---

## Cross-references

| Source | Finding |
|--------|---------|
| [COMPREHENSIVE-AUDIT frontend](../../../frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md) | Staff list @ 777WW — verify backend API |
| [SPEC-CODE-AUDIT 2026-07-03](../completed/SPEC-CODE-AUDIT-2026-07-03.md) | Prior spec hardening baseline — residual `spec:consistency` blind spot still applies |

---

## Appendix A — Compliance matrix (rollup)

Status values: `pass` | `fail` | `gap` | `skip` | `n/a` | `partial`

### auth (`backend/auth/`)

Oracle: `docs/specs/backend/auth/auth-spec.md` + `backend/auth/openapi.yaml` · Standard: `coding-standard/auth/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 mesh | N/A — auth is JWT issuer, not mesh upstream | n/a | Expected: internal APIs use `AUTH_INTERNAL_SERVICE_SECRET` bearer (`internal.route.js`) |
| CS-01 | auth/01 tech-stack | `package.json`, `src/server.js` | `npm run ci` (lint, test) | pass — Fastify 5, ESM, `node --test`, `--env-file` |
| CS-02 | auth/02 folder-structure | `src/modules/{auth,admin,internal}/` | lint boundaries | pass — `*.schema.js` (renamed from `*.validator.js` 2026-07-08) |
| CS-03 | auth/03 api-routing | `auth.route.js`, `admin.route.js` | spec:lint | pass — `/auth/*` public paths |
| CS-04 | auth/04 request-headers | `src/app.js` L52–81 | test (implicit) | partial — duplicate → `AUTH_INVALID_REQUEST` (auth zone code, not `INVALID_HEADER`) |
| CS-05 | auth/05 security-validation | `*.schema.js` on routes | spec:lint | pass |
| CS-06 | auth/06 response-codes | `lib/problem.js`, OpenAPI | spec:lint, spec:codes | pass — problem+json |
| CS-07 | auth/07 openapi-contract | `openapi.yaml` | spec:lint (`--fail-severity=error`) | pass |
| CS-08 | auth/08 openapi-validation | `.spectral.yaml` | spec:lint, spec:roles | pass |
| CS-09 | auth/09 operations | `routes/health.route.js` | test | pass |
| CS-10 | auth/10 observability | `config/logger.js` | lint | pass — pino; no `console.log` in app code |
| SPEC-01 | auth-spec.md | modules vs spec | spec:consistency | partial — markdown links only; runtime proof Phase 3 |

### gateway (`backend/gateway/`)

Oracle: `docs/specs/backend/gateway/gateway-spec.md` + `backend/gateway/openapi.yaml` · Standard: `coding-standard/gateway/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `proxy/register-proxies.js`, `plugins/inject-context.js` | `proxy.integration.test.js` | pass — strips `Authorization` + client `x-user-*`; injects trusted headers |
| CS-04 | gateway/04 request-headers | `app.js` L88–96 | test | pass — duplicate trusted headers → `GATEWAY_CLAIM_REJECTED` |
| CS-03 | gateway/03 api-routing | `routes.json`, `register-proxies.js` | test | pass — longest-prefix proxy table |
| CS-07 | gateway/07 openapi | `openapi.yaml` | spec:lint (`--fail-severity=error`) | pass — fail-severity added 2026-07-08 |
| CS-09 | gateway/09 operations | `routes/health.route.js` | test | pass — JWKS + optional Redis readyz |
| CS-10 | gateway/10 observability | `config/logger.js` | lint | pass |
| SPEC-01 | gateway-spec.md | routes vs spec | spec:consistency | partial — smart-report 130s timeout routes need runtime check (Phase 3) |

### demo-service (`backend/service/demo-service/`)

Oracle: **None** — `README.md` + `docs/architecture.md` + `openapi.yaml` + `openapi-via-gateway.yaml` · Standard: `coding-standard/backend/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `plugins/gateway-secret.js` | integration tests (when RUN) | pass — mesh guard on `/api/v1` |
| CS-02 | backend/02 folder-structure | `modules/me`, `modules/items` | lint | pass — route/controller/service/repository/schema |
| CS-04 | backend/04 request-headers | `plugins/duplicate-header.js` | test (when RUN) | pass — includes `x-user-home-branch`, `x-user-role`, `x-user-permissions` (fixed 2026-07-08) |
| CS-07 | backend/07 openapi | `openapi.yaml`, `openapi-via-gateway.yaml` | spec:lint (in ci) | pass — `spec:lint` added to ci (fixed 2026-07-08) |
| CS-09 | backend/09 operations | `routes/health.route.js` | test | pass |
| CS-10 | backend/10 observability | `config/logger.js` | lint | pass |
| SPEC-01 | No central spec | README vs code | spec:consistency | partial — no `spec:consistency`; README corrected to Fastify 5 (fixed 2026-07-08) |
| INT-01 | TESTING pattern | `items.mongo.integration.test.js` | npm test in GHA | pass — `.env.test` in matrix (TD-010 fixed 2026-07-08) |

### staff (`backend/service/staff/`)

Oracle: `docs/specs/backend/staff/staff-spec.md` + `openapi.yaml` + `openapi-via-gateway.yaml` · Standard: `coding-standard/backend/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `plugins/gateway-secret.js` | `mesh.guard.test.js` | pass |
| CS-02 | backend/02 folder-structure | `modules/profiles/*.route/controller/service/repository/schema.js` | lint | pass — reference internal service |
| CS-04 | backend/04 request-headers | `plugins/duplicate-header.js` | mesh.guard.test.js | pass — includes full `x-user-*` set |
| CS-07 | backend/07 openapi | `openapi.yaml` | spec:lint (in ci) | pass |
| CS-08 | backend/08 openapi-validation | `.spectral.yaml` | spec:lint | pass |
| CS-09 | backend/09 operations | `routes/health.route.js` | health.probe.test.js | pass |
| CS-10 | backend/10 observability | `config/logger.js` | lint | pass |
| SPEC-01 | staff-spec AC-01..12 | profiles integration tests | spec:consistency | pass — 218/218 in CI with `.env.test` + `init:db` (fixed 2026-07-08) |
| INT-01 | CI integration truth | `profiles.*.test.js` RUN gate | npm test in GHA | pass — `.env.test` in matrix + `init:db` in ci (TD-010 fixed 2026-07-08) |

### agent-invoice (`backend/service/agent-invoice/`)

Oracle: `docs/specs/backend/agent-invoice/agent-invoice-spec.md` + `openapi.yaml` · Standard: `coding-standard/backend/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `plugins/gateway-secret.js` | `app.test.js`, route integration | pass |
| CS-02 | backend/02 folder-structure | `modules/{agents,agent-fees,invoices}/` + `plugins/{gateway-secret,duplicate-header}.js` + `routes/health.route.js` | lint | pass — mesh extracted 2026-07-08 (response codes unchanged) |
| CS-04 | backend/04 request-headers | `app.js` CRITICAL_HEADERS via `lib/critical-headers.js` | app.test.js + critical-headers.test.js | pass — includes `x-user-home-branch` (BE-002 fixed 2026-07-08) |
| CS-05 | backend/05 security-validation | `*.schema.js` on routes | spec:lint | pass |
| CS-07 | backend/07 openapi | `openapi.yaml` | spec:lint (in ci) | pass |
| CS-09 | backend/09 operations | `routes/health.route.js` + `/metrics` | test:integration:ci | pass |
| CS-10 | backend/10 observability | inline `logger` in `app.js` | lint | partial — not `loggerInstance`/shared pino config pattern |
| SPEC-01 | agent-invoice-spec.md | invoices/agents routes | spec:consistency | partial — `.env.test` in GHA; Phase 4 IDOR/mesh spot-check pass |
| INT-01 | integration | `test:integration:ci` | ci | pass in GHA (with `.env.test`) |

### smart-report (`backend/service/smart-report/`)

Oracle: `docs/specs/backend/smart-report/smart-report-spec.md` + [`openapi.yaml`](../../../backend/service/smart-report/openapi.yaml) + `codes.yaml` · Standard: `coding-standard/backend/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `plugins/gateway-secret.js` | `guards.test.js` | pass |
| CS-02 | backend/02 folder-structure | `modules/reports/` | lint | pass — route/controller/service/repository/schema |
| CS-04 | backend/04 request-headers | `plugins/duplicate-header.js` | unit + guards tests | pass |
| CS-07 | backend/07 openapi | `openapi.yaml` (skeleton 2026-07-08) | spec:lint (in ci) | pass — happy-path list/create/validate/test-run/download; full CRUD later |
| CS-08 | backend/08 openapi-validation | `.spectral.yaml` | spec:lint | pass |
| CS-09 | backend/09 operations | `routes/health.route.js` | test | pass |
| CS-10 | backend/10 observability | inline logger + redact | lint | pass |
| SPEC-01 | openapi + technical-architecture | `reports.route.js` | spec:consistency, spec:codes, spec:lint | pass — skeleton SoT; remaining paths still prose |
| SPEC-02 | smart-report-spec.md | sandbox/save gates | test (unit/integration) | partial — RBAC enforced via gateway; deep sandbox adversarial not fully exercised (deferred with ZAP) |

### branch-report (`backend/service/branch-report/`)

Oracle: `docs/specs/backend/branch-report/branch-report-spec.md` + `openapi.yaml` · Standard: `coding-standard/backend/`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-1 | golden-principles §1 | `plugins/gateway-auth.js` | integration tests | pass |
| CS-02 | backend/02 folder-structure | `modules/{invite-links,royalty-21-times}/` + `routes/health.route.js` | lint | partial — health in `routes/` not `modules/` |
| CS-04 | backend/04 request-headers | `plugins/duplicate-header-guard.js` | `critical-headers.test.js` | pass |
| CS-07 | backend/07 openapi | `openapi.yaml` | spec:lint (in ci) | pass |
| CS-09 | backend/09 operations | `routes/health.route.js` | test | pass |
| CS-11 | backend/11 format | `package.json` ci | format:check in ci | pass — added 2026-07-08 |
| CS-13 | backend/13 audit | `package.json` ci | audit:check in ci | pass — added 2026-07-08 |
| SPEC-01 | branch-report-spec.md | invite-links, royalty routes | spec:consistency | partial — read-replica seed limitation (plan R-04) |

### shared (`backend/shared/platform-roles/`)

Oracle: README + auth OpenAPI role enum · Standard: cross-cutting (GP-5)

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| GP-5 | golden-principles §5 shared utils | `index.js` VALID_ROLES, ADMIN_ROLES | `test/roles.test.js` | pass — canonical role SoT |
| CS-01 | naming | `package.json` `@zero-platform/roles` | npm test | pass |
| SPEC-01 | auth OpenAPI roles | consumed by gateway, staff, agent-invoice | spec:roles (auth only) | partial — downstream relies on auth gate for role enum sync |

### `backend/test/ecosystem.factory.test.js`

| Rule ID | Source | Code location | Auto gate | Gaps / status |
|---------|--------|---------------|-----------|---------------|
| HARNESS-01 | ci-all backend | `backend/test/*.test.js` | ci-all.sh | pass — Phase 1 ci-all |

---

## Appendix B — CI run log

### Phase 1 — ci-all backend (local)

#### B.1 Canonical (plan command, includes install)

```
Date: 2026-07-08T17:39+07:00
Command: cd backend && docker compose up -d && ./scripts/ci/ci-all.sh --only backend --skip-smoke
Harness: PORT_OFFSET=0; MongoDB + Redis compose up; mongodb ready (compose exec)
Install: backend/scripts/install-all-deps.sh (sequential npm ci × 7 backend + frontend)
Duration: ~281s
Exit: 1 — ci-all failed (6 steps)

Per-service npm run ci (canonical):
  auth              FAIL — bootstrap:spectral ENOTEMPTY (es-abstract/2015)
  gateway           FAIL — eslint MODULE_NOT_FOUND (../package.json)
  staff             FAIL — spec:lint: spectral not found (after openapi.yaml pass)
  agent-invoice     FAIL — spec:lint: Cannot find module 'builtins'
  smart-report      FAIL — npm test 11 pass / 19 fail (ERR_MODULE_NOT_FOUND deps)
  branch-report     PASS — 77 tests, 0 fail
  demo-service      FAIL — lint: eslint not found
  shared            PASS — ecosystem.factory 3/3
```

#### B.2 Verification (deps intact, skip install)

```
Date: 2026-07-08T17:47+07:00
Command: ./scripts/ci/ci-all.sh --only backend --skip-smoke --skip-install
Duration: ~96s
Exit: 0 — ci-all passed

Per-service npm run ci (all PASS):
  auth 193 tests | gateway 76 | staff 168 | agent-invoice 105 | smart-report 161 | branch-report 77 | demo-service 20 | shared 3
```

Notes:
  - staff `npm ci` emitted many npm tar ENOENT warnings; install reported success but left broken spectral/eslint trees (BE-001).
  - Mechanical gates (lint, format, spec:*, audit) green on B.2 for all seven services.

#### B.3 Post-fix TD-010 verification (skip install)

```
Date: 2026-07-08T17:52+07:00
Command: ./scripts/ci/ci-all.sh --only backend --skip-smoke --skip-install
Duration: ~82s
Exit: 0 — ci-all passed

Changes: staff/demo `.env.test`; GHA/ci-all matrix `env_file`; demo `spec:lint` in ci; demo duplicate-header; staff `init:db` in ci.

Per-service npm run ci (all PASS, 0 skip):
  auth 193 | gateway 76 | staff 218 | agent-invoice 47 | smart-report 160 | branch-report 77 | demo-service 30 | shared 3
```

### Phase 2 staff integration (local)

```
Date: 2026-07-08
Command: cd backend/service/staff && npm test
Mongo: zero-platform-mongodb healthy (docker compose up -d in backend/)
MONGODB_URI: mongodb://127.0.0.1:27017/zero-platform (.env)
Results: 218 pass, 0 fail, 0 skipped, 0 documented skip
Duration: ~27.4s
```

### Phase 2 demo-service integration (local, optional)

```
Date: 2026-07-08
Command: cd backend/service/demo-service && NODE_ENV=test npm test
Results: 30 pass, 0 fail, 0 skipped
```

## Appendix C — Staff AC coverage

| AC | Test file | Ran (not skip) | Pass | Notes |
|----|-----------|----------------|------|-------|
| AC-01 | profiles.permissions.test.js | yes | pass | Dual + enforce permission matrix |
| AC-02 | profiles.create.provision.test.js | yes | pass | POST provision 201 + auth duplicate 409 |
| AC-03 | profiles.archive.revoke.test.js | yes | pass | Archive succeeds when auth revoke fails |
| AC-04 | profiles.patch.test.js | yes | pass | If-Match, field guards, admin PATCH |
| AC-05 | profiles.permissions.test.js | yes | pass | Enforce mode denies without permission keys |
| AC-06 | CI scripts (`npm run ci`) | yes | pass | Phase 1 ci-all — staff `npm run ci` green on verify run (Appendix B.2) |
| AC-07 | profiles.get.test.js, rbac.test.js | yes | pass | List scope AC-7; RBAC unit + integration |
| AC-08 | profiles.lifecycle.test.js | yes | pass | Archive/restore, self-archive guard |
| AC-09 | profiles.create.provision.test.js | yes | pass | Provision path (shared file with AC-02) |
| AC-10 | profiles.get.test.js | yes | pass | GET by id, lookup, ETag |
| AC-11 | health.probe.test.js | yes | pass | healthz + readyz (incl. T04 Mongo readyz) |
| AC-12 | profiles.create.link.test.js | yes | pass | POST with user_id link + branch scope |

---


## Appendix D — Phase 3 API runtime evidence (2026-07-08)

Harness: `PORT_OFFSET=0`, gateway `http://127.0.0.1:3000`, auth `:3001`, staff `:3101`. Credentials: `platform_admin` / `1234`, `client_kind: native` (refresh in JSON body).

### Smoke

`./scripts/dev/smoke.sh` → **pass** (exit 0): healthz ×7, metrics ×3, auth login, `GET /api/v1/me`, `GET /auth/me/branches`, backoffice shell + auth proxy.

### BUG-01 — staff list via gateway

| Caller / branch | HTTP | `pagination.total` / rows | Sample profile ids (no secrets) |
|-----------------|------|---------------------------|----------------------------------|
| `platform_admin` Zero HQ `6a3000010000000000000001` | 200 | 2 / 2 | `6a4dfd9e0bd49e11f6f5373a`, `6a4dfd9e0bd49e11f6f5373b` (branch HQ) |
| `platform_admin` after `POST /auth/me/active-branch` → 777WW `5f4fb5bb3156af7a2db9e5a0` | 200 | 3 / 3 | `6a4dfd9d0bd49e11f6f53738`, `6a4dfd9e0bd49e11f6f53739`, `6a4dfd9e0bd49e11f6f5373c` |
| `branch_admin` home branch 777WW | 200 | 3 / 3 | same three seed ids |

**Verdict:** Backend/gateway return seeded staff rows for 777WW. Empty staff table in backoffice is **not** a staff/gateway scope bug → **frontend**.

**Frontend fix (2026-07-08):** `ab81416` — React Compiler left `useServerDataTable` on an empty row model after async fetch (`"use no memo"` + drop `manualPagination`). Verified on `/staff` @ 777WW (3 rows / `3 total`). Same root cause closed BUG-02 (Smart Reports). Details: [COMPREHENSIVE-AUDIT §7](../../../frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md).

Note: native `POST /auth/me/active-branch` requires `refresh_token` in body (cookie optional); omitting it yields `401 TOKEN_REFRESH_REJECTED` even when JWT `token_gen` matches Redis/Mongo.

### Other spot-checks

| Endpoint | Result |
|----------|--------|
| `GET /api/v1/me` | 200 — ou/branch/userId/role from gateway-injected claims |
| `GET /auth/me/branches` | 200 — 197 branches; includes 777WW |
| `GET /api/v1/invoices` (777WW / `branch_admin`) | 200 — `data.items[0].iv_no=IV-202607-001`, status READY |
| `GET /api/v1/agent-invoice/agents` | 200 — agent `6a2000010000000000000001` (777WW) |
| `GET /api/v1/smart-reports` | 200 — total 4 seeded reports |
| `GET http://127.0.0.1:3101/api/v1/staff/profiles` without `x-gateway-secret` | **401** `GATEWAY_SECRET_REJECTED` |

branch-report domain list not exercised (harness seed skipped — `MONGODB_URI_READ` remote/read-only).

## Appendix E — Phase 4 adversarial + Phase 5 security sweep (2026-07-08)

Harness: `PORT_OFFSET=0`, gateway `http://127.0.0.1:3000`, Redis `redis://127.0.0.1:6379/0` (docker `zero-platform-redis` up).

### Cross-service checklist

| Check | Result | Evidence |
|-------|--------|----------|
| Internal without `x-gateway-secret` | **PASS** | staff `:3101`, agent-invoice `:3102`, demo `:3002`, smart-report `:3103`, branch-report `:3104` → `401 GATEWAY_SECRET_REJECTED` |
| Wrong `x-gateway-secret` | **PASS** | staff + agent-invoice → `401 GATEWAY_SECRET_REJECTED` |
| Duplicate critical header via gateway | **PASS** | Dual `x-user-role` → `401 GATEWAY_CLAIM_REJECTED` (“Duplicate header not allowed”) |
| Duplicate critical header on staff internal | **PASS** | Dual `x-user-role` → `400 INVALID_HEADER` |
| Spoof `x-user-role` / `x-user-id` via gateway | **PASS** | `branch_admin` JWT + spoofed `platform_admin` headers → `/api/v1/me` returns JWT role/id; staff list still `total=3` |
| Token after session revoke (Redis) | **PASS** | `POST /internal/users/{id}/sessions/revoke` → old access via gateway `401 GATEWAY_JWT_REJECTED` (“Access token generation is stale”); re-login works |
| IDOR staff GET HQ profile as `branch_admin` | **PASS** | `GET /api/v1/staff/profiles/{hq_id}` → `404 RESOURCE_NOT_FOUND` |
| IDOR staff direct mesh WW claims + HQ id | **PASS** | `:3101` with WW claims → `404 RESOURCE_NOT_FOUND` |
| Invoice cross-branch query override | **PASS** | `branch_admin` `?branch_id={HQ}` still returns only WW invoice |
| Invoice as `staff` role | **PASS** | `403 PERMISSION_DENIED` (no `invoices:list`) |
| `platform_admin` GET WW invoice while JWT at HQ | **observe** | HTTP 200 — platform global scope **by design**, not IDOR |
| Staff PATCH without `If-Match` | **PASS** | `428 PRECONDITION_REQUIRED` |
| Staff PATCH stale `If-Match` | **PASS** | `412 VERSION_CONFLICT` |
| smart-report sandbox deep adversarial | **deferred** | Mesh secret + permission gate verified; deep sandbox payload cases not run |
| OWASP ZAP baseline on `:3000` | **deferred** | Optional; not run this round |

### Phase 5 — Security sweep summary

- **Trust boundary:** All five internal services reject missing/wrong mesh secret. Gateway strips/overwrites client `x-user-*` and rejects duplicate claim headers.
- **AuthZ / IDOR:** Staff branch scope holds for list and `:id` GET. Invoice list ignores query branch override for `branch_admin`. Permission matrix blocks `staff` on invoices. `platform_admin` cross-branch invoice access is intentional elevated scope.
- **Session revoke:** Redis-backed `token_gen` path works end-to-end through gateway.
- **DAST:** ZAP not run — deferred (no CI ZAP; optional local).

### Incomplete axes (honest)

| Item | Status |
|------|--------|
| branch-report domain API with local seed data | incomplete — harness seed skipped (Atlas read-only URI) |
| smart-report deep sandbox / malicious query adversarial | incomplete — RBAC+mesh only |
| Invoice READY→PAID status machine mutations | not re-run this round (covered by existing agent-invoice tests; no harness mutation hunt) |
| Bruno collections | skipped (optional) |
| ZAP | deferred |

## Open questions — discuss later

Items needing human decision before implementation. Each includes a one-line recommendation.

| Topic | Context | Recommendation |
|-------|---------|----------------|
| **agent-invoice: inline mesh guards** | Mesh/header guards live in `app.js` hooks, not shared `plugins/` like staff/demo — functionally correct but diverges from reference layout. | **Decided: Defer** (2026-07-08) — refactor only if team wants layout uniformity; not blocking. BE-002 home-branch dup guard fixed in-line without extracting plugins. |
| **smart-report: OpenAPI + spec:lint** | No `openapi.yaml`; prose API table in `technical-architecture.md` is the oracle — highest drift risk in the fleet. | **Closed 2026-07-08** — `openapi.yaml` skeleton (list/create/validate/test-run/download + probes) + `spec:lint` in ci; full CRUD paths still prose (TD-011 closed). |
| **auth: `*.validator.js` vs `*.schema.js`** | Auth used `*.validator.js` naming; backend standard prefers `*.schema.js`. | **Done** (2026-07-08) — renamed to `auth.schema.js` / `admin.schema.js` / `internal.schema.js`; auth tests 193/193; architecture.md path updated. CHANGELOG historical filenames left as-is. |
| **gateway: `--fail-severity=error`** | Auth `spec:lint` fails on warnings; gateway did not — weaker Spectral gate. | **Done** (earlier 2026-07-08) — `--fail-severity=error` already in gateway `package.json`. |
| **branch-report: format + audit in CI** | `package.json` `ci` omitted `format:check` and `audit:check` unlike other services. | **Done** (earlier 2026-07-08) — wired into `ci`. |
| **branch-report: health in `routes/`** | `routes/health.route.js` sits outside `modules/`; most peers still inline health in `app.js`. | **Decided: Accept** (2026-07-08) — keep; later fleet-wide shared ops pattern. |
| **Redis/token_gen E2E harness** | Manual harness test for revoke → gateway reject not automated as cross-service script. | **Phase 4 manually PASS**. Mitigation 2026-07-08: GHA Redis service + existing gateway `jwt-auth-token-gen` unit coverage; full login→revoke→proxy script still optional (see RUNBOOK). |
| **Frontend BUG-01: staff table empty** | Backoffice staff list @ 777WW empty in UI. | **Concluded Phase 3** — backend OK → frontend. **Fixed in-tree** (`ab81416`) — `useServerDataTable` `"use no memo"` + core row model; see [COMPREHENSIVE-AUDIT](../../../frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md) §7. |
| **OWASP ZAP on gateway** | Optional DAST not in CI. | **Defer** — RUNBOOK documents how to run baseline; do not make required gate yet. |
| **branch-report local seed** | Harness skips seed when `MONGODB_URI_READ` is remote/read-only. | **Open** — need localhost read replica or documented Atlas seed path before domain API review. |

---

## Progress log

- 2026-07-08: Skeleton created with plan amendment.
- 2026-07-08: **Phase 0a+0b complete** — coding-standard + spec oracle sampling; Appendix A matrices drafted; executive summary coding-standard + spec drift verdicts set to **partial**; TD-010 confirmed via code review.
- 2026-07-08: Phase 2 staff integration truth — `NODE_ENV=test npm test` with Mongo healthy; 218 pass, 0 documented skip.
- 2026-07-08: **Phase 1 CI (partial)** — canonical `ci-all --only backend --skip-smoke` exit 1 (install/tooling); `--skip-install` verify exit 0 all services (Appendix B).
- 2026-07-08: **TD-010 fix round** — staff/demo `.env.test`; GHA + ci-all matrix; demo README/spec:lint/duplicate-header; staff `init:db` in ci; Phase 1 re-run exit 0, staff 218/218 + demo 30/30, 0 skip (Appendix B.3); open questions section added.
- 2026-07-08: **Open questions decided** — Q1 Defer (agent-invoice mesh); Q2 Defer (smart-report OpenAPI); Q3 Migrate (auth `*.schema.js`); Q4 Fix now (gateway Spectral `--fail-severity=error` done); Q5 Fix now (branch-report format+audit done + prettier); Q6 Accept (keep `routes/health`, later fleet extract); Q7 Defer (Redis E2E); Q8 Phase 3 first (BUG-01 staff table).
- 2026-07-08: **Phase 3 API runtime complete** — `dev-up` (stack already up / ready), `seed-all` via boot, `smoke.sh` **pass** (exit 0). Spot-checks through gateway: `/api/v1/me`, `/auth/me/branches` (197), staff HQ vs 777WW (2 vs 3), invoices (`IV-202607-001`), smart-reports (4), staff internal without secret → 401. **BUG-01 owner: frontend** (backend list OK). Phase 4 not started.
- 2026-07-08: **Frontend BUG-01 fixed** — commit `ab81416` (`useServerDataTable` React Compiler opt-out); findings appendix + open questions updated.
- 2026-07-08: **Phase 4–6 closeout** — adversarial checklist **pass** (Appendix E); revoke+Redis E2E **pass**; **BE-002** fixed (agent-invoice `x-user-home-branch` dup guard + `lib/critical-headers.js`); auth `*.schema.js` rename (193 tests pass); TD-011/TD-012 added to findings + `tech-debt-tracker.md`; overall verdict **GO with caveats**; `docs-lint` **pass**.