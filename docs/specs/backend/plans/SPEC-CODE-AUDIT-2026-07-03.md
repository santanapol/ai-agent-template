# Spec vs Code Audit — 2026-07-03

Read-only re-audit of all backend services. Method: `backend-service-spec-bootstrap` re-audit lifecycle (DISCOVER + grep-driven extraction matrix).

**Fix round (2026-07-03):** backlog items below addressed in same repo — agent-invoice re-harden, smart-report/auth/staff doc sync, gateway spectral vendored, CI matrix + branch-report bootstrap.


---

## Executive summary

| Service | Central spec | `spec:consistency` | Drift count | Highest severity |
|---------|-------------|-------------------|-------------|------------------|
| **staff** | yes | pass | 1 | P3 doc |
| **auth** | yes | pass | 3 | P2 doc |
| **gateway** | yes | pass | 2 | P2 CI |
| **smart-report** | yes | pass | 10+ | P1 behavioral/doc |
| **agent-invoice** | yes | pass | 15+ | **P1 security/doc** |
| **branch-report** | **no** | N/A | Tier E gap | P1 governance |

**Key finding:** `spec:consistency` passes on all 5 spec services but **does not detect behavioral drift** (branch scope, env var names, invoice statuses, OpenAPI vs runtime). **agent-invoice** is the highest-priority fix: central spec still describes pre-#46 branch behavior while code enforces `scopeBranchId` + `resolveListInvoicesRequestQuery`.

**CI gaps (repo-wide):**

| Gap | Impact |
|-----|--------|
| `smart-report` not in GHA matrix | spec gates never run in CI |
| `branch-report` not in GHA matrix | lint only local |
| Gateway `spec:lint` extends `coding-standard/.../org-api.yaml` **outside repo** | GHA fails on clean checkout |
| Frontend job builds `frontend/backoffice` only | `backoffice-shadcn` untested in GHA |

---

## Baseline gates (local, 2026-07-03)

| Package | spec:consistency | spec:lint | spec:codes |
|---------|------------------|-----------|------------|
| auth | pass | pass (0 errors) | pass |
| gateway | pass | pass (1 warning) | pass |
| staff | pass | pass | pass |
| agent-invoice | pass | pass (29 warnings) | N/A |
| smart-report | pass | N/A | pass |
| branch-report | N/A | pass | N/A |

---

## Per-service findings

### staff (Tier A — golden reference)

- **Inventory:** `src/` 62/62, scripts 5
- **Extraction matrix:** all rows **synced** (roles, permissions, collections, OpenAPI paths, cross-service auth)
- **Drift:** `STAFF-DOC-001` (P3) — optional `x-user-home-branch` in code/tests, not in `technical-architecture.md` §3
- **Verdict:** Safe reference; no re-harden needed

### auth (Tier A− — post #47)

- **Inventory:** `src/` 39/39, 28 test files
- **Extraction matrix:** VALID_ROLES, password min 8, JWT 7 claims, 11 audit events, 7 collections — **synced**
- **Drift:**
  - `AUTH-DRIFT-01` (P2) — ERD missing `by_ou_role` index from `init-db.mjs`
  - `AUTH-DRIFT-02` (P2) — package `README.md` still says password "pending code"
  - `AUTH-DRIFT-03` (P3) — `technical-architecture.md` §9 env table incomplete
- **Verdict:** Runtime aligned; doc-only gaps

### gateway (Tier B)

- **Inventory:** `src/` 16/16, 14 test files
- **Extraction matrix:** routes.json (10 upstreams incl. branch-report `:3015`), JWT/redis, problem codes — **synced** per confidence-map
- **Drift:**
  - `GW-CI-01` (P2) — `.spectral.yaml` extends `../../../../coding-standard/gateway/spectral/org-api.yaml` — **file missing** in repo → GHA `spec:lint` fails
  - `GW-CI-02` (P3) — local `spec:lint` 1 warning (non-blocking)
- **Verdict:** Spec content sound; fix spectral ruleset path for CI

### smart-report (Tier B)

- **Inventory:** `src/` **58** (spec claims 56 — stale)
- **Confidence-map:** thin vs staff golden (~15% structure)
- **Drift (selected):**
  - `SR-02` (P1) — spec `REPORT_OUTPUT_DIR` vs code `REPORTS_STORAGE_DIR`
  - `SR-03` (P1) — spec `TEST_RUN_TIMEOUT_MS` vs code `REPORT_SCRIPT_TIMEOUT_MS`
  - `SR-09` (P1) — `MONGODB_URI_READ` test fallback to `MONGODB_URI` undocumented
  - `SR-05`–`SR-08` (P2) — permissions, ERD fields, `triggeredBy` values
  - `SR-10` (P3) — not in GHA CI matrix
- **Verdict:** Re-harden prose + env table; expand confidence-map; add CI matrix entry

### agent-invoice (Tier B+ — highest priority)

- **Inventory:** `src/` **77** (spec claims 75 — stale)
- **Branch scope (post #46) — P1 DRIFT:**

| ID | Spec (stale) | Code (current) | Tests |
|----|--------------|----------------|-------|
| AI-BS-01 | By-id: filter `ouId` only | `resolveScopeBranchId` → repo `branch_id` filter on detail/transactions/status/calculate-fee | `invoices.by-id-branch-scope.test.js` (11) |
| AI-BS-02 | List: inject branch when missing; explicit override | `resolveListInvoicesRequestQuery` — pinned roles **always** coerced; `branch_id=all` sentinel for OU-wide roles | `invoices.list-branch-scope.test.js` + unit |
| AI-BS-03 | No role matrix | `canSwitchActiveBranchRole` = platform_admin, support_admin, support | integration |
| AI-BS-04 | No `all` sentinel | `ALL_BRANCHES_QUERY = "all"` | integration |
| AI-BS-05 | AC table incomplete | Missing by-id AC rows | tests exist, AC missing |

- **Other drift:** invoice statuses (spec: draft/calculated vs code: PENDING/READY/PAID/…), ERD `branch_category_fees` vs `agent_fees`, OpenAPI `branch_id` schema vs runtime `"all"`, master-data path `/categories` vs `/game-categories`, env `GATEWAY_SECRET` vs `GATEWAY_SHARED_SECRET`, confidence-map claims "synced"
- **Verdict:** **Downgrade `status: implemented` → re-audit required** per skill; update §Branch scope, business-domain §5, AC table, openapi, confidence-map

### branch-report (Tier E — no central spec)

- **Inventory:** `src/` 39/39, `test/` 3
- **As-built:** Fastify `:3015`, modules `invite-links` + `royalty-21-times`, mesh auth only (no backend permission check), DB `MONGODB_DB_BRANCH` read-only analytics on `member`, `su_staff_invite_link`, `dm_dm_tn_deposit`, `wallet_withdraw`
- **Gateway:** `/api/v1/branch-report` → `:3015` (in `routes.json` + PM2 after #36)
- **Legacy docs drift:** package `docs/` and `_mission-control/SPEC.md` vs code (channel rules, field names)
- **CI:** no `spec:consistency`, no `npm run ci`, not in GHA matrix
- **Verdict:** Full `/spec-bootstrap-backend` when ready (user previously deferred)

---

## Cross-service

| Topic | Status |
|-------|--------|
| `VALID_ROLES` (5 roles) | Synced across auth, staff, agent-invoice mesh guards |
| Gateway secret naming | `GATEWAY_SECRET` (gateway) vs `GATEWAY_SHARED_SECRET` (services) — documented in gateway spec; agent-invoice technical-architecture uses wrong name |
| Gateway route table | Includes auth, staff, agent-invoice, invoices, smart-reports (+ timeouts), branch-report |
| Central spec coverage | 5/6 services; branch-report missing |

---

## Priority backlog (fix round — **completed 2026-07-03**)

| Priority | Action | Service | Status |
|----------|--------|---------|--------|
| **P0** | Update §Branch scope + business-domain §5 + AC + openapi to match #46; refresh confidence-map | agent-invoice | done |
| **P1** | Fix env var names in technical-architecture; document test DB fallback | smart-report | done |
| **P1** | Vendor spectral ruleset in-repo; fix `.spectral.yaml` paths | gateway + all OpenAPI services | done |
| **P1** | Add smart-report + branch-report to CI matrix with `.env.test` | CI | done |
| **P2** | ERD index `by_ou_role`; package README password row | auth | done |
| **P2** | Expand confidence-map to staff golden structure | smart-report | done |
| **P2** | Document `x-user-home-branch` | staff | done |
| **P3** | Full spec bootstrap | branch-report | done |

---

## Parallel execution note

All 6 service audits are **independent** (read-only, separate packages). Only this consolidation step required sequential merge. Recommended fix round: **agent-invoice first**, then **CI matrix**, then **smart-report re-harden**, then **branch-report bootstrap**.

---

*Generated: 2026-07-03. Auditors: parallel subagents + baseline gate run. Deliverable: report only per user decision.*
