---
status: completed
created: 2026-07-08
updated: 2026-07-08
completed: 2026-07-08
review-round: 1
services: [auth, gateway, demo-service, staff, agent-invoice, smart-report, branch-report]
---

# Plan: Backend comprehensive review — standards, tests, API, security, bug hunt

## Objective

Execute a **backend-only** quality review across all seven runnable services plus shared packages. The review must go beyond “CI is green” — validate behavior against **product specs**, **OpenAPI contracts**, and **`coding-standard`** org rules, then run **adversarial bug hunt** where automated gates and existing tests have known blind spots (especially staff integration tests that skip without MongoDB).

This plan was drafted from a review-session discussion (2026-07-08). It is independent of the frontend comprehensive audit (`frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md`) but may cross-reference findings (e.g. staff list branch scoping).

## Scope

| In scope | Out of scope (separate plans) |
|----------|-------------------------------|
| `backend/auth`, `gateway`, `service/*` (7 services) | `frontend/backoffice-next` UI review |
| `backend/shared/platform-roles`, `backend/test/` | Production deploy / PM2 changes |
| `coding-standard/` (auth, gateway, backend zones) | Full OWASP ZAP automation in CI (optional manual phase) |
| `docs/specs/backend/<service>/` | Org upstream `coding-standard` sync |

### Review round vs fix round

| Round | Goal | Output |
|-------|------|--------|
| **Review (this plan)** | Document truth: spec vs code vs runtime; file bugs; compliance matrices | [backend-review-findings-2026-07-08.md](../active/backend-review-findings-2026-07-08.md) |
| **Fix (follow-up)** | Resolve P0/P1 findings; add `.env.test` for staff/demo in CI (TD-010) | Separate PRs per domain |

Do **not** block review closeout on fixing every finding — ticket and prioritize instead.

## Architecture reminder (trust boundary)

```
Client ──Bearer JWT──► gateway (:3000) ──x-gateway-secret + x-user-*──► Internal APIs
         ▲                    │
         └── login/refresh ───┘ auth (:3001)
```

**Golden principles** (`docs/golden-principles.md`): internal APIs must validate `x-gateway-secret`; must not verify JWT; gateway must not forward `Authorization`; client `x-user-*` must be stripped/overwritten at gateway.

---

## Review methodology (phases)

### Phase 0a — Standards oracle (`coding-standard`)

Read before touching code or tests. Per service, use the correct zone:

| Service | coding-standard zone |
|---------|---------------------|
| auth | `coding-standard/auth/01–13*.md`, `auth/codes.yaml` |
| gateway | `coding-standard/gateway/01–11*.md`, `gateway/codes.yaml` |
| staff, agent-invoice, smart-report, branch-report, demo-service | `coding-standard/backend/01–13*.md` |
| All | `coding-standard/naming-conventions.md` |

**Core 01–10 checklist (every internal service):**

| # | Doc | Manual review focus |
|---|-----|---------------------|
| 01 | tech-stack | Fastify 5, ESM, `node --test`, `--env-file` (no dotenv) |
| 02 | folder-structure | `modules/<feature>/*.route/controller/service/repository/schema.js`; no layer skipping |
| 03 | api-routing | `/api/v1/...` paths, HTTP methods |
| 04 | request-headers | trusted headers, duplicate critical header → `400 INVALID_HEADER`, `x-request-id` |
| 05 | security-validation | JSON Schema at boundary |
| 06 | response-codes | problem+json, envelope, real HTTP status |
| 07 | openapi-contract | summaries, tags, error refs |
| 08 | openapi-validation | Spectral + trusted-header-order |
| 09 | operations | `/healthz`, `/readyz`, graceful shutdown |
| 10 | observability | pino structured logs, no `console.log` |

**Extensions 11–13:** database connection/shutdown, pagination/soft-delete/`id` mapping, lockfile/`npm ci`/eslint security.

### Phase 0b — Product oracle (`docs/specs` + OpenAPI)

**Rule:** Spec and OpenAPI (or prose API table) are oracles — if runtime ≠ oracle, it is a bug even when tests pass.

#### Oracle sources per service (actual paths)

| Service | Package path | Central spec | HTTP contract oracle |
|---------|--------------|--------------|----------------------|
| auth | `backend/auth/` | `docs/specs/backend/auth/auth-spec.md` | `backend/auth/openapi.yaml` |
| gateway | `backend/gateway/` | `docs/specs/backend/gateway/gateway-spec.md` | `backend/gateway/openapi.yaml` |
| demo-service | `backend/service/demo-service/` | **None** — use `README.md` + `coding-standard/backend/` | `openapi.yaml` + `openapi-via-gateway.yaml` |
| staff | `backend/service/staff/` | `docs/specs/backend/staff/staff-spec.md` | `openapi.yaml` + `openapi-via-gateway.yaml` |
| agent-invoice | `backend/service/agent-invoice/` | `docs/specs/backend/agent-invoice/agent-invoice-spec.md` | `openapi.yaml` |
| smart-report | `backend/service/smart-report/` | `docs/specs/backend/smart-report/smart-report-spec.md` | **No `openapi.yaml`** — use `technical-architecture.md` API table + `codes.yaml` via `spec:codes` |
| branch-report | `backend/service/branch-report/` | `docs/specs/backend/branch-report/branch-report-spec.md` | `openapi.yaml` |

Per service:

1. Read spec + `business-domain.md` (where present)
2. Read HTTP oracle from table above
3. Build **AC / rule matrix** (template below)
4. Note `confidence-map.md` and `TESTING.md` gaps

### Phase 1 — Automated gates (`npm run ci`)

```bash
# All backend (requires MongoDB docker for some services)
./scripts/ci/ci-all.sh --only backend --skip-smoke

# Per service
cd backend/<service> && npm ci && npm run ci
```

**Note:** Local `./scripts/ci/ci-all.sh --only backend` mirrors [`.github/workflows/ci-check.yml`](../../../.github/workflows/ci-check.yml) — staff and demo-service do **not** get `.env.test`; integration may skip (same as GHA).

**What CI actually enforces (mechanical):**

| Gate | Covers | Services |
|------|--------|----------|
| `npm run lint` | ESLint, security plugin, boundaries (where configured) | all |
| `npm run format:check` | Prettier | all except branch-report |
| `spec:lint` | Spectral on OpenAPI | auth, gateway, staff, agent-invoice, branch-report |
| `spec:codes` | Error code registry sync | auth, gateway, staff, smart-report |
| `spec:roles` | Role definitions in OpenAPI | **auth only** |
| `spec:consistency` | Markdown links, roles alignment — **not** behavioral proof | all with central spec |
| `npm test` | Unit + integration **when env allows** | all |
| `npm audit` | Dependency high/critical | auth, gateway, staff, agent-invoice, smart-report, demo-service |

### Phase 2 — Test layer review (do not trust green alone)

| Layer | What it proves | Known gaps in this repo |
|-------|----------------|-------------------------|
| **Unit** | Pure logic (RBAC helpers, compilers, fee calc, pagination) | No HTTP, no real DB, no gateway flow |
| **Integration** | HTTP + Mongo in-process | **staff**, **demo-service**: skip entire suites when `MONGODB_URI` empty — CI matrix does not copy `.env.test` for them |
| **API (smoke)** | healthz, login, `/me`, branches | No CRUD, no branch-scope, no status transitions |
| **Security (automated)** | mesh guard unit tests, JWT/token_gen tests, `npm audit` | No ZAP in CI; no systematic IDOR suite |

#### CI integration reality matrix

| Service | Integration in GHA CI | Notes |
|---------|----------------------|-------|
| auth | **Runs** | `MongoMemoryReplSet` in tests |
| gateway | **Runs** | No Mongo required |
| agent-invoice | **Runs** | `.env.test` copied in matrix |
| smart-report | **Runs** | `.env.test` copied in matrix |
| branch-report | **Runs** | `.env.test` copied in matrix |
| staff | **Often skips** | No `.env.test` in matrix; tests use `if (!RUN)` → `"documented skip"` passes |
| demo-service | **Often skips** | Same pattern as staff |

**Staff integration must be run locally with Mongo:**

```bash
cd backend/service/staff
# Ensure MONGODB_URI is set (e.g. from .env.example or harness)
npm test
# Optional coverage gate
npm run ci:with-coverage
```

### Phase 3 — Manual API testing (runtime proof)

#### Test data oracle (harness)

| Item | Value |
|------|-------|
| Boot | `./scripts/dev/dev-up.sh` then `./scripts/dev/seed-all.sh` if needed |
| Credentials | `platform_admin` / `1234` (or `SMOKE_USERNAME` / `SMOKE_PASSWORD` from smoke) |
| Customer branch (seed data) | `5f4fb5bb3156af7a2db9e5a0` (777WW) |
| Zero HQ | Default active branch after login — often empty for billing/staff lists |
| Mongo | `docker compose up -d` in `backend/`; Redis required for **token_gen E2E** |
| DB name (harness) | `zero-platform` (or `zero-platform_0` with `PORT_OFFSET`) |

Boot stack:

```bash
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh
```

Test **through gateway** (`:3000`) unless explicitly testing mesh rejection on direct internal ports.

#### Smoke limitations (`scripts/dev/smoke.sh`)

Smoke is **sanity only** — not API regression:

| Covered | Not covered |
|---------|-------------|
| `/healthz` all services | CRUD on any domain |
| auth login + `GET /api/v1/me` | Branch-scoped list/detail |
| `GET /auth/me/branches` | Invoice status transitions |
| `/metrics` on agent-invoice, smart-report, branch-report | smart-report validate/test-run/save gate |
| Optional Bruno auth health (`|| true`) | Permission matrix per role |

#### Bruno collections (optional, if `bru` CLI installed)

| Collection | Path | Gap |
|------------|------|-----|
| auth | `backend/_bruno/auth/` | — |
| gateway proxied | `backend/_bruno/gateway/` | — |
| staff internal + proxied | `backend/_bruno/staff-service/`, `staff-service-proxied/` | — |
| agent-invoice | `backend/_bruno/agent-invoice-service/` | — |
| demo | `backend/_bruno/demo-service/`, `demo-service-proxied/` | — |
| smart-report | **None** | Use curl + `technical-architecture.md` API table |
| branch-report | **None** | Use curl + `openapi.yaml` |

### Phase 4 — Adversarial bug hunt

Principles:

1. **Spec is oracle** — derive cases from AC and business-domain rules
2. **Tests are contracts** — verify tests actually ran (`RUN=true`), not skip placeholders
3. **Triangulate** — spec vs OpenAPI vs curl/Bruno vs mongosh
4. **Think attacker** — trust boundary, IDOR, role escalation, state machine violations

**Cross-service adversarial checklist:**

- [x] Call internal port without `x-gateway-secret` → `401 GATEWAY_SECRET_REJECTED`
- [x] Wrong `x-gateway-secret` → reject
- [x] Client sends duplicate critical header → `400 INVALID_HEADER`
- [x] Client sends `x-user-role: platform_admin` through gateway → upstream gets JWT role, not spoofed value
- [x] Call internal port directly bypassing gateway
- [x] Token after session revoke → gateway `401`
- [x] Cross-branch access to `:id` resources (IDOR)
- [x] Mutations without `If-Match` where required → `428`
- [x] Stale `If-Match` → `412 VERSION_CONFLICT`
- [x] Invalid status transitions (e.g. invoice READY → PAID only)
- [x] smart-report: sandbox escape, save without test-run token, path traversal on exports

### Phase 5 — Security sweep

| Type | In repo today | Bug hunt add-on |
|------|---------------|-----------------|
| SAST | eslint-plugin-security | Review warnings manually |
| Dependencies | `npm audit` in ci | — |
| AuthZ | partial integration tests | IDOR on every `:id` route |
| Trust boundary | mesh.guard tests | Direct upstream calls |
| DAST | Not in CI | OWASP ZAP against gateway `:3000` (see `coding-standard/software-testing/09-security-testing/`) |

### Phase 6 — Closeout

**Deliverable:** [backend-review-findings-2026-07-08.md](../active/backend-review-findings-2026-07-08.md) (single rollup — not per-service docs).

#### Findings template outline

| Section | Content |
|---------|---------|
| Executive summary | Verdict per axis (CI, standards, integration, API, security, spec drift) + severity counts |
| Per-service status | Phase 1–4 pass/fail matrix per service |
| Bug table | ID / severity / service / title / repro / expected / actual / owner / fix PR |
| Systemic gaps | Candidate tech-debt rows → [tech-debt-tracker.md](../tech-debt-tracker.md) (e.g. TD-010) |
| Appendices | Compliance matrix rollup, CI run log, staff AC coverage |

- [x] Fill findings doc per template above
- [x] Update compliance matrix (all rows filled) — can live in findings doc appendix
- [x] File bugs with reproduction (curl + expected vs actual)
- [x] Add **TD-010** to [tech-debt-tracker.md](../tech-debt-tracker.md) if staff/demo CI gap confirmed
- [x] Optional after fix round: `/review` + `security-auditor` subagent on diffs
- [x] Move **this plan** to `completed/` when review round is signed off (fixes may continue in follow-up PRs)

---

## Parallel execution (subagents)

Work that does **not** share mutable state can run in parallel via Cursor subagents (`explore`, `code-reviewer`, `security-auditor`, `test-engineer`).

### Wave 0 — Oracle (parallel, read-only)

| Subagent | Scope | Deliverable |
|----------|-------|-------------|
| explore × 3 | auth+gateway / staff+demo / agent-invoice+smart-report+branch-report | Draft compliance matrix rows per group |
| explore × 1 | `coding-standard/` cross-check vs `golden-principles.md` | Drift notes |

### Wave 1 — CI (parallel after Mongo up)

```bash
cd backend && docker compose up -d
```

| Subagent | Command | Service group |
|----------|---------|---------------|
| shell | `cd backend/auth && npm ci && npm run ci` | auth |
| shell | `cd backend/gateway && npm ci && npm run ci` | gateway |
| shell | `cd backend/service/staff && npm ci && npm run ci` | staff (note: may skip integration) |
| shell | `cd backend/service/agent-invoice && cp .env.test .env && npm ci && npm run ci` | agent-invoice |
| shell | `cd backend/service/smart-report && cp .env.test .env && npm ci && npm run ci` | smart-report |
| shell | `cd backend/service/branch-report && cp .env.test .env && npm ci && npm run ci` | branch-report |
| shell | `cd backend/service/demo-service && npm ci && npm run ci` | demo-service |

Or single: `./scripts/ci/ci-all.sh --only backend --skip-smoke`

### Wave 2 — Integration truth (parallel, needs Mongo)

| Subagent | Focus |
|----------|-------|
| test-engineer | staff: `MONGODB_URI=mongodb://127.0.0.1:27017/zero-platform npm test` — verify AC suites not skip |
| test-engineer | demo-service: integration with Mongo |
| test-engineer | agent-invoice + smart-report: re-run integration subset if Wave 1 failed |

### Wave 3 — Runtime + bug hunt (sequential harness, parallel per service)

1. One agent: `./scripts/dev/dev-up.sh` + `smoke.sh`
2. Then parallel:

| Subagent | Scope |
|----------|-------|
| explore + curl | staff + gateway trust boundary |
| explore + curl | agent-invoice IDOR + If-Match |
| security-auditor | smart-report sandbox adversarial cases |
| explore + curl | branch-report date range + auth menus (Bruno auth admin optional) |

### Wave 4 — Closeout (single agent)

Merge findings into `backend-review-findings-2026-07-08.md`; dedupe bugs; update tech-debt-tracker.

**Decision:** Use subagents for **read/explore and per-service CI**; keep **one harness stack** for Wave 3 to avoid port/DB conflicts.

---

## Compliance matrix template (copy per service)

| Rule ID | Source (standard / spec / AC) | Code location | Auto gate | Test exists | Test runs in CI | Manual verified | Status |
|---------|------------------------------|---------------|-----------|-------------|-----------------|-----------------|--------|
| GP-1 | golden-principles §1 mesh secret | `plugins/mesh*.js` | partial | mesh.guard.test.js | varies | | |
| CS-04 | backend/04 duplicate header | middleware | | | | | |
| AC-12 | staff-spec AC-12 | profiles.create.link.test.js | | yes | **often NO** | | |

Status values: `pass` | `fail` | `gap` | `skip` | `n/a`

---

## Per-service review guide

### 1. auth — `:3001`

| Item | Detail |
|------|--------|
| **CI** | lint, format, spec:lint, spec:codes, spec:roles, spec:consistency, test, audit |
| **Tests** | 31 files — integration uses in-memory replica set |
| **Spec** | `docs/specs/backend/auth/auth-spec.md`, `TESTING.md` |
| **Standard** | `coding-standard/auth/` |

**Priority tests:**

- `test/auth.integration.test.js` — login lifecycle
- `test/internal-revoke*.test.js` — token_gen / Redis
- `test/active-branch*.test.js`, `test/branches-list.integration.test.js`
- `test/me-menus.integration.test.js`, `test/jwt-permissions.test.js`

**Bug hunt:**

- Login after revoke → 401 at gateway (**requires Redis** — see below)
- Branch switch JWT claims
- Internal API without service secret
- `platform_admin` vs `branch_admin` permission differences

**Redis / token_gen E2E (manual, harness with Redis running):**

1. Login → get `access_token`
2. Revoke session (password change or internal revoke) → `token_gen` bumps in Redis
3. Request with **old** token via gateway → expect `401`
4. Login again → new token works

Unit tests: `test/internal-revoke-redis.integration.test.js`, `test/active-branch-redis.integration.test.js` (most other auth tests use `REDIS_URL: ''`).

---

### 2. gateway — `:3000`

| Item | Detail |
|------|--------|
| **CI** | lint, format, spec:lint, spec:codes, spec:consistency, test, audit |
| **Tests** | 14 files |
| **Routes SoT** | `backend/gateway/routes.json` |
| **Standard** | `coding-standard/gateway/` |

**Priority tests:**

- `test/proxy.integration.test.js` — header injection, no `Authorization` forward
- `test/plugins/jwt-auth-token-gen.test.js`
- `test/app.health.test.js`

**Bug hunt (highest priority for security):**

- Header spoofing via gateway
- Redis fail-closed on `token_gen` read failure (gateway rejects when Redis down in production mode)
- Missing route in `routes.json` vs existing upstream endpoint
- smart-report timeout routes (130s)

**Redis E2E with auth:** pair gateway bug hunt with auth revoke flow above — gateway is the enforcement point.

**Route table (offset 0):**

| Prefix | Upstream | Port |
|--------|----------|------|
| `/api/v1/items`, `/api/v1/me` | demo-service | 3002 |
| `/api/v1/staff` | staff | 3101 |
| `/auth` | auth | 3001 (public) |
| `/api/v1/agent-invoice`, `/api/v1/invoices` | agent-invoice | 3102 |
| `/api/v1/smart-reports*` | smart-report | 3103 |
| `/api/v1/branch-report` | branch-report | 3104 |

---

### 3. demo-service — `:3002`

| Item | Detail |
|------|--------|
| **Role** | Reference internal API template |
| **CI** | lint, format, test, audit |
| **Modules** | `me`, `items` |
| **Integration** | Skips without `MONGODB_URI` in CI |

**Bug hunt:** mesh guard, `/me` trusted headers, items CRUD pagination — use as baseline to compare other services.

---

### 4. staff — `:3101` ⚠️ priority

| Item | Detail |
|------|--------|
| **CI** | lint, format, spec:lint (2 files), spec:codes, spec:consistency, test, audit |
| **Tests** | 29 files — **12 ACs mapped in staff-spec** |
| **Spec ACs** | AC-01 … AC-12 in `docs/specs/backend/staff/staff-spec.md` |
| **Known gap** | `TESTING.md` roadmap: integration CI pattern like agent-invoice; local CI may skip Mongo suites |

**AC → test file map (from spec):**

| AC | Test file |
|----|-----------|
| AC-01 | `profiles.permissions.test.js` |
| AC-02 | `profiles.create.provision.test.js` |
| AC-03 | `profiles.archive.revoke.test.js` |
| AC-04 | `profiles.patch.test.js` |
| AC-05 | `profiles.permissions.test.js` |
| AC-06 | CI scripts |
| AC-07 | `profiles.get.test.js`, `rbac.test.js` |
| AC-08 | `profiles.lifecycle.test.js` |
| AC-09 | `profiles.create.provision.test.js` |
| AC-10 | `profiles.get.test.js` |
| AC-11 | `health.probe.test.js` |
| AC-12 | `profiles.create.link.test.js` |

**Mandatory local run:**

```bash
cd backend/service/staff
# MONGODB_URI must be set — copy from .env.example or use harness DB
npm test
npm run ci:with-coverage   # optional thresholds
```

**Bug hunt (beyond AC):**

- List on Zero HQ vs customer branch `5f4fb5bb3156af7a2db9e5a0` (777WW) — frontend audit found API returns 3 on 777WW
- `PERMISSION_MODE=enforce` blocking platform_admin (AC-05)
- branch_admin cross-branch create (AC-12)
- Pagination + `q` + `branch_id` combinations

**API smoke:**

```bash
TOKEN=... # from login via gateway
curl -sf "http://127.0.0.1:3000/api/v1/staff/profiles?branch_id=5f4fb5bb3156af7a2db9e5a0" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. agent-invoice — `:3102`

| Item | Detail |
|------|--------|
| **CI** | lint, format, spec:lint, test:unit, test:integration:ci, spec:consistency, audit |
| **Env** | `.env.test` in GHA matrix |
| **Tests** | 16 files |
| **Modules** | `agents`, `agent-fees`, `invoices` |

**Priority integration tests:**

- `invoices.list-branch-scope.test.js`
- `invoices.by-id-branch-scope.test.js`
- `agent-fees.route.test.js` (If-Match)
- `agents.route.test.js`

**Bug hunt:**

- IDOR: invoice on branch A with token scoped to branch B
- Status machine: READY → PAID only
- Optimistic locking races on fee override
- Duplicate invoice generation for same billing month

---

### 6. smart-report — `:3103` ⚠️ security-critical

| Item | Detail |
|------|--------|
| **CI** | lint, format, spec:codes, spec:consistency, test, audit (no spec:lint in ci) |
| **OpenAPI** | Prose contract in technical-architecture — **higher drift risk** |
| **Tests** | 22 files |

**Priority tests:**

- `script-compiler.service.test.js`, `script-validator.service.test.js`
- `sandbox-runner.*.test.js`, `test-run-token.service.test.js`
- `validate-test-run.route.test.js`, `reports.route.test.js`
- `guards.test.js`

**Bug hunt (P0 class):**

- Sandbox escape (`child_process`, `require`, infinite loop)
- Save report without valid `testRunToken`
- Export path traversal
- Query outside branch scope
- Exceed gateway timeout (130s)

---

### 7. branch-report — `:3104`

| Item | Detail |
|------|--------|
| **CI** | lint, spec:lint, spec:consistency, test |
| **Modules** | `royalty-21-times`, `invite-links` |
| **Tests** | 13 files |

**Bug hunt:**

- Date boundary / UTC (`reg-date-range.test.js`)
- Empty vs error when read replica has no marketing data
- Local harness may skip seed when `MONGODB_URI_READ` is remote read-only

---

### 8. Shared

| Package | Command |
|---------|---------|
| `backend/shared/platform-roles` | `npm test` |
| `backend/test/ecosystem.factory.test.js` | `node --test backend/test/*.test.js` (via ci-all) |

---

## Recommended execution order

| Day | Focus | Est. time | Parallel? |
|-----|-------|-----------|-----------|
| **D0** | Phase 0a+0b: standards + spec oracles; compliance matrices | 2–3 h | Wave 0 subagents |
| **D1 AM** | Phase 1: `ci-all --only backend` + record failures | 1–2 h | Wave 1 subagents |
| **D1 PM** | Phase 2: staff + demo integration with Mongo; AC matrix | 3–4 h | Wave 2 subagents |
| **D2** | Phase 3–4: harness, smoke, per-service curl/bug hunt | 4–5 h | Wave 3 after single dev-up |
| **D3** | agent-invoice + smart-report deep dive if not done D2 | 3–4 h | Parallel subagents |
| **D4** | Phase 5–6: security sweep, findings doc, tech-debt | 2–3 h | Wave 4 single agent |

**Risk-based priority if time-boxed:**

1. staff (CI skip gap + production CRUD)
2. gateway (trust boundary)
3. smart-report (sandbox)
4. agent-invoice (billing / IDOR)
5. auth
6. branch-report
7. demo-service

---

## Commands reference

```bash
# Infrastructure
cd backend && docker compose up -d

# Full backend CI
./scripts/ci/ci-all.sh --only backend --skip-smoke

# Harness + smoke
./scripts/dev/dev-up.sh
./scripts/dev/smoke.sh

# Docs lint
node scripts/ci/docs-lint.mjs

# Env status
node scripts/ci/env-status.mjs

# Staff integration (must have Mongo)
cd backend/service/staff && npm test

# Agent-invoice (CI-like)
cd backend/service/agent-invoice && cp .env.test .env && npm run ci

# Login for manual API tests
curl -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"platform_admin","password":"1234","client_kind":"native"}'
```

---

## Tasks

### Phase 0a — coding-standard oracle
- [x] Read `docs/golden-principles.md`
- [x] Read `coding-standard/README.md` + zone docs per service (01–13)
- [x] Read `coding-standard/naming-conventions.md`

### Phase 0b — product oracle
- [x] Per service: use **Oracle sources** table (spec + HTTP contract)
- [x] Create compliance matrix per service (template above)

### Phase 1 — Automated
- [x] Run `./scripts/ci/ci-all.sh --only backend --skip-smoke`
- [x] Record per-service pass/fail in findings doc — **document only**, do not block on fixes

### Phase 2 — Integration truth
- [x] Run staff `npm test` with `MONGODB_URI` set; confirm AC suites are not skip
- [x] Run demo-service integration with Mongo if needed
- [x] Mark matrix column “Test runs in CI” for every AC

### Phase 3 — API runtime
- [x] `dev-up` + `seed-all` + `smoke.sh` (understand smoke limitations)
- [x] Per-service curl/Bruno (where collections exist)
- [x] mongosh verification for mutating operations

### Phase 4 — Adversarial bug hunt
- [x] Cross-service adversarial checklist
- [x] Per-service bug hunt sections (staff, gateway, smart-report priority)

### Phase 5 — Security sweep
- [x] Trust boundary sweep (all internal services)
- [x] IDOR on `:id` routes (staff, agent-invoice)
- [x] smart-report sandbox manual attempts
- [x] Redis/token_gen E2E (auth + gateway)
- [x] Optional: OWASP ZAP baseline on gateway `:3000`

### Phase 6 — Closeout
- [x] Complete [backend-review-findings-2026-07-08.md](../active/backend-review-findings-2026-07-08.md) per template (methodology Phase 6)
- [x] File systemic gaps in findings → `tech-debt-tracker.md` (TD-010 if confirmed)
- [x] Move this plan to `completed/` when review round signed off — **fixes continue in follow-up PRs**

---

## Risks and known systemic gaps

| ID | Risk | Mitigation |
|----|------|------------|
| R-01 | staff/demo integration **pass CI with skip placeholders** | Force local Mongo run; add `.env.test` to GHA matrix (future PR) |
| R-02 | `spec:consistency` does not prove runtime behavior | Spec-driven manual cases + mongosh |
| R-03 | smart-report lacks OpenAPI in CI `spec:lint` | Extra manual review against technical-architecture API table |
| R-04 | branch-report local seed skipped (read-only URI) | Document as env limitation; test on staging with read DB |
| R-05 | Bruno not in CI | Manual or optional `bru run` in smoke phase |
| R-06 | Frontend audit BUG-01 (staff table empty) may be frontend-only | Verify staff API via gateway during staff review |
| R-07 | smart-report / branch-report no Bruno collections | curl + OpenAPI/prose API table only |

**Planned tech debt (fix round, not review blocker):**

| ID | Domain | Priority | Description | Status |
|----|--------|----------|-------------|--------|
| TD-010 | CI | P2 | Add committed `.env.test` for staff + demo-service; add `env_file` to GHA matrix and `ci-all.sh` — stops integration skip placeholders | closed (2026-07-08) |

---

## Related documents

| Document | Purpose |
|----------|---------|
| [backend/ARCHITECTURE.md](../../../backend/ARCHITECTURE.md) | Trust boundary ADR |
| [backend/ENV.md](../../../backend/ENV.md) | Env file workflow |
| [backend/RUNBOOK.md](../../../backend/RUNBOOK.md) | Manual ops |
| [RUNBOOK.md](../../../RUNBOOK.md) | Harness hub |
| [docs/golden-principles.md](../../golden-principles.md) | Mechanical invariants |
| [coding-standard/README.md](../../../coding-standard/README.md) | Org standards vendored copy |
| [coding-standard/software-testing/00-software_testing_overview/README.md](../../../coding-standard/software-testing/00-software_testing_overview/README.md) | Testing levels index |
| [completed/SPEC-CODE-AUDIT-2026-07-03.md](../completed/SPEC-CODE-AUDIT-2026-07-03.md) | Prior spec vs code audit |
| [completed/frontend-ui-audit-2026-07.md](../completed/frontend-ui-audit-2026-07.md) | Related frontend audit (archived 2026-07-09) |
| [frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md](../../../frontend/backoffice-next/docs/COMPREHENSIVE-AUDIT-2026-07-08.md) | Cross-ref staff/branch findings |
| [backend-review-findings-2026-07-08.md](../active/backend-review-findings-2026-07-08.md) | Review output (this round) |

---

## Progress log

- 2026-07-08: Plan created from review-session discussion (backend-only, standards + bug hunt methodology).
- 2026-07-08: Plan reviewed and amended — oracle table, smoke/Bruno gaps, Redis E2E, review vs fix scope, subagent waves, findings deliverable, TD-010.
- 2026-07-08: Review round signed off (findings `status: complete`, GO with caveats). Plan archived to `completed/`. Residual fixes tracked separately (TD-012 closed via install harden; TD-011 OpenAPI; fleet health; etc.).

## Decision log

- 2026-07-08: **Spec + coding-standard before tests** — oracles for bug hunt, not post-hoc checklist.
- 2026-07-08: **Do not trust CI green for staff integration** — verify `RUN=true` with Mongo locally.
- 2026-07-08: **Adversarial testing required** — existing AC tests necessary but not sufficient.
- 2026-07-08: **Review round documents; fix round is separate** — closeout does not require all bugs fixed.
- 2026-07-08: **Findings live in** `backend-review-findings-2026-07-08.md` (not per-service docs) — single rollup for cross-service bugs.
- 2026-07-08: **demo-service oracle** — no central spec; use README + OpenAPI + coding-standard/backend (not blocking).
- 2026-07-08: **smart-report HTTP oracle** — technical-architecture API table + spec:codes; no openapi.yaml in CI (accepted drift risk, manual extra pass).
- 2026-07-08: **Subagent parallelism** — Wave 1 CI and Wave 0 oracle in parallel; one harness for Wave 3; merge in Wave 4.
- 2026-07-08: **TD-010 deferred to fix round** — confirm gap during review, implement `.env.test` in follow-up PR.
- 2026-07-08: **OWASP ZAP optional** — manual only this round; not blocking closeout.
