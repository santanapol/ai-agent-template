# Tasks: Royalty 21 Times

> Plan: [plan.md](./plan.md) · Spec: [../SPEC.md](../SPEC.md)  
> Legend: `[ ]` pending · `[x]` done  
> Updated: 2026-06-29 (Phase 7 reg-date amendment added)

---

## Phase 1: Backend foundation

### Task T1: Scaffold branch-report service

**Description:** Create new Fastify 5 ESM service with app/server entry, MongoDB singleton, gateway-auth + user-context plugins, health routes, request-id handling, duplicate-header guard, global validation error handler, and `.env.example`. At T1, inspect `agent-invoice` / `smart-report` for permission middleware pattern — adopt only if they already check `x-user-permissions`.

**Acceptance criteria:**
- [x] `package.json` with scripts: `dev`, `test`, `lint`
- [x] `src/app.js` registers plugins and module routes (empty stubs OK)
- [x] `src/config/database.js` uses `MONGODB_URI` + `MONGODB_DB_BRANCH`
- [x] `src/plugins/gateway-auth.js` validates `x-gateway-secret`
- [x] `src/plugins/user-context.js` exposes `request.userContext` from `x-user-ou`, `x-user-branch`
- [x] **`x-request-id`:** read from request (or generate), attach to `request.requestId`, include in all envelope responses
- [x] **Duplicate header policy:** duplicate critical headers (e.g. `x-user-ou`, `x-user-branch`, `x-gateway-secret`) → HTTP `400`, `code: INVALID_HEADER`
- [x] **`setErrorHandler`:** Fastify validation errors (`error.validation`) → `{ success: false, code, message, data: null, requestId }` per coding standard
- [x] Service starts on configured PORT (e.g. 3015)
- [x] Document decision: backend permission middleware yes/no (see plan architecture decisions) — **phase 1: gateway + frontend guard only** (reference services not in workspace)

**Verification:**
- [x] `npm run dev` — service listens without error
- [x] Missing gateway secret → 401/403 per standard
- [x] Duplicate `x-user-branch` header → 400 `INVALID_HEADER`
- [x] Invalid query on a stub route → validation error envelope (not raw Fastify error)

**Dependencies:** None

**Files likely touched:**
- `package.json`, `.env.example`
- `src/app.js`, `src/server.js`
- `src/config/database.js`
- `src/plugins/gateway-auth.js`, `src/plugins/user-context.js`
- `src/plugins/request-id.js` (or equivalent)
- `src/plugins/duplicate-header-guard.js` (or equivalent)
- `src/lib/error-handler.js` (or inline in `app.js`)

**Estimated scope:** M

---

### Task T2: Shared lib + unit tests

**Description:** Implement response envelope helpers, business constants, and `formatRegisterDate(reg_date)` → `DD/MM/YYYY` UTC.

**Acceptance criteria:**
- [x] `sendSuccess(reply, { data, pagination?, requestId })` → `code: SUCCESS`
- [x] `sendError(reply, status, code, message, requestId)` → `data: null`
- [x] `DEPOSIT_SUCCESS_STATUS`, `WITHDRAW_SUCCESS_STATUS` exported
- [x] `formatRegisterDate(ISODate('2024-06-15T10:30:00Z'))` → `'15/06/2024'`

**Verification:**
- [x] `npm test` — all lib tests pass

**Dependencies:** T1

**Files likely touched:**
- `src/lib/response.js`, `src/lib/constants.js`, `src/lib/format-register.js`
- `src/lib/format-register.test.js`

**Estimated scope:** S

---

### Task T3: OpenAPI skeleton

**Description:** Create `openapi.yaml` (3.1.0) with service info, security (`x-gateway-secret`), tags, and stub paths for both endpoints.

**Acceptance criteria:**
- [x] File at service root per O4
- [x] Paths under `/api/v1/branch-report/`
- [x] Gateway mesh headers documented on operations (`x-gateway-secret`, `x-user-ou`, `x-user-branch`, `x-request-id`)

**Verification:**
- [x] YAML valid; spectral lint if available in repo

**Dependencies:** T1

**Files likely touched:**
- `openapi.yaml`

**Estimated scope:** S

---

### Checkpoint CP-1

- [x] Service boots; lib tests pass
- [x] Request-id, duplicate-header, error handler verified
- [x] OpenAPI skeleton in place

---

## Phase 2: Invite links API

### Task T4: GET /invite-links module

**Description:** Full vertical slice — query `su_staff_invite_link` scoped by `ou_id` + `branch_id`, sort `invite_code` ASC, map to `{ id, inviteCode, username, description }`.

**Acceptance criteria:**
- [x] Route `GET /api/v1/branch-report/invite-links`
- [x] No query params; tenant from `userContext` only
- [x] Standard envelope; `data` is array (no pagination)
- [x] Integration/unit test asserts scope filter in query

**Verification:**
- [x] `npm test` — invite-links tests pass
- [ ] Manual curl **direct to service** with `x-gateway-secret`, `x-user-ou`, `x-user-branch` returns sorted list

**Dependencies:** T1, T2

**Files likely touched:**
- `src/modules/invite-links/*` (route, controller, service, repository, schema)
- `src/modules/invite-links/invite-links.test.js`

**Estimated scope:** M

---

### Checkpoint CP-2

- [x] Invite links API works via integration tests (mock DB)
- [x] Tenant scope and sort order confirmed in repository tests
- [ ] Manual curl on dev MongoDB (when DB available)

---

## Phase 3: Royalty 21 Times API

### Task T5: Channel filter + pagination helpers

**Description:** Pure functions: build member match from `channelType` + `inviteLinkId`; normalize `page`/`pageSize` (default 50, max 100 clamp).

**Acceptance criteria:**
- [x] `affiliate_link` requires valid ObjectId `inviteLinkId` or throws INVALID_PARAM
- [x] `member_referral` → `{ referral: 'Member' }`
- [x] `direct` → `{ referral: 'Branch' }`
- [x] Invalid `channelType` value → INVALID_PARAM or validation error
- [x] All include base `{ ou_id, branch_id }`
- [x] `normalizePagination({ page: 0, pageSize: 200 })` → `{ page: 1, pageSize: 100 }`

**Verification:**
- [x] `npm test` — filter/pagination tests pass

**Dependencies:** T2 (may start in parallel with T4)

**Files likely touched:**
- `src/lib/channel-filter.js`, `src/lib/pagination.js`
- `src/lib/channel-filter.test.js`, `src/lib/pagination.test.js`

**Estimated scope:** S

---

### Task T6a: Member list + count + pagination

**Description:** Repository methods to find members matching channel filter, sort `username` ASC, return `{ members, total }` for a page. No per-member metrics yet.

**Acceptance criteria:**
- [x] `findMembersPage({ userContext, channelFilter, page, pageSize })` returns member docs with `_id`, `username`, `reg_date`
- [x] `countMembers({ userContext, channelFilter })` returns total for pagination
- [x] Sort: `username` ASC
- [x] Every query includes `{ ou_id, branch_id }`
- [x] Unit/integration test with mocked repository or fixture DB

**Verification:**
- [x] `npm test` — member list/count tests pass

**Dependencies:** T4, T5

**Files likely touched:**
- `src/modules/royalty-21-times/royalty-21-times.repository.js` (partial)
- `src/modules/royalty-21-times/royalty-21-times.repository.test.js` (partial)

**Estimated scope:** M

---

### Task T6b: Bulk metrics aggregation

**Description:** For a page of `mem_id`s, compute lifetime billin, withdraw, promotion=0, revenue, and deposits[1–21] in **bulk** (no N+1).

**Acceptance criteria:**
- [x] Single aggregation (or fixed small number) per collection using `mem_id: { $in: [...] }`
- [x] Billin: SUM `amt` from `dm_dm_tn_deposit` where `status ∈ DEPOSIT_SUCCESS_STATUS`
- [x] Withdraw: SUM `amt` from `wallet_withdraw` where `wd_status = "200"`
- [x] Deposits 1–21: sort `bill_date` ASC per member; **no `$dateAdd +7`**
- [x] `promotion = 0`; `revenue = billin - withdraw - promotion`
- [x] Returns map keyed by `mem_id` for merge in service layer

**Verification:**
- [x] `npm test` — fixture with 3 deposits → amounts at indices 0–2, rest 0
- [x] Code review: no loop calling DB per member

**Dependencies:** T6a

**Files likely touched:**
- `src/modules/royalty-21-times/royalty-21-times.repository.js` (metrics methods)
- `src/modules/royalty-21-times/royalty-21-times.repository.test.js`

**Estimated scope:** M

---

### Task T6c: Route wire-up + integration tests

**Description:** Complete module — route, controller, service (orchestrate T6a + T6b + format-register), JSON schema validation, full response envelope.

**Acceptance criteria:**
- [x] Route `GET /api/v1/branch-report/royalty-21-times`
- [x] Query: `channelType`, `inviteLinkId?`, `page`, `pageSize` (JSON Schema on route)
- [x] Response: `data[]` + `pagination: { page, pageSize, total }`
- [x] Row: `{ username, register, billin, withdraw, promotion, revenue, deposits }` — `register` DD/MM/YYYY server-side; `deposits` length 21
- [x] Invalid `inviteLinkId` → `INVALID_PARAM`
- [x] `affiliate_link` without `inviteLinkId` → `INVALID_PARAM`
- [x] Integration test: end-to-end row shape for fixture member

**Verification:**
- [x] `npm test` — module integration tests pass
- [ ] Manual curl (direct service): affiliate channel returns paginated rows

**Dependencies:** T6b

**Files likely touched:**
- `src/modules/royalty-21-times/*` (route, controller, service, schema)
- `src/modules/royalty-21-times/royalty-21-times.test.js`

**Estimated scope:** M

---

### Checkpoint CP-3

- [x] Royalty API returns correct row shape (integration tests)
- [x] Error cases: invalid/missing `inviteLinkId`, invalid `channelType`
- [x] Standard envelope on success and error (AC-8 partial)
- [ ] Tenant isolation verified on dev MongoDB (manual)
- [ ] All 3 channel types on real data (manual)

---

## Phase 4: Platform wiring

### Task T7: Gateway route registration

**Description:** Add `ROUTES_JSON` entry: `/api/v1/branch-report` → `http://branch-report:3015` (env-specific).

**Acceptance criteria:**
- [x] `routes.json` + `routes.example.json` + `gateway/.env.example` `ROUTES_JSON` — `/api/v1/branch-report` → `http://127.0.0.1:3015`, `stripPrefix: false`
- [x] `gateway/README.md` proxy table documents branch-report `:3015`
- [ ] Gateway proxies both endpoints (manual curl through gateway)
- [ ] JWT claims injected as `x-user-ou`, `x-user-branch` (gateway standard — verify at CP-4)
- [ ] Client never calls branch-report port directly (enforced by frontend at T9+)

**Verification:**
- [x] `npm test` in `backend/gateway` — routes file alignment passes
- [ ] curl through gateway with Bearer token succeeds for both endpoints

**Dependencies:** T6c

**Files touched:**
- `backend/gateway/routes.json`, `routes.example.json`, `.env.example`, `README.md`

**Estimated scope:** S

---

### Task T8: Auth permission seed

**Description:** Add `branch-report:marketing:channel-performance:read` to permission catalog; assign to appropriate dev/staging roles.

**Acceptance criteria:**
- [x] Menu hierarchy: `branch-report` → `branch-report:marketing` → `branch-report:marketing:channel-performance:read`
- [x] `platform_admin`: `branch-report:*`; `branch_admin`: `branch-report:marketing:channel-performance:read`
- [ ] Test role can access route; role without permission cannot (after T12)

**Verification:**
- [x] `validateSeedData` + `test/seed-permissions.test.js` pass
- [ ] Run `node --env-file=.env scripts/seed-permissions.js` on dev MongoDB
- [ ] JWT for test user includes permission (if permissions in token)

**Dependencies:** None (parallel with T7 after T6c)

**Files touched:**
- `backend/auth/scripts/seed-data/permissions.js`

**Estimated scope:** S

---

### Checkpoint CP-4

- [ ] Both APIs reachable via gateway from backoffice origin (re-confirms CP-2)
- [ ] Permission guard blocks unauthorized user (after T12)

---

## Phase 5: Frontend

### Task T9: API client + TypeScript types

**Description:** `branchReportApiClient.ts` calling gateway; types for envelope, `InviteLinkItem`, `Royalty21Row`. Follow existing backoffice axios + data-fetch pattern (React Query if project standard).

**Acceptance criteria:**
- [x] `getInviteLinks()` → `InviteLinkItem[]`
- [x] `getRoyalty21Times(params)` → `{ data, pagination }`
- [x] Uses existing axios interceptor / token injection pattern (`baseApiClient`)
- [x] `BranchReportApiError` when envelope `success: false`

**Verification:**
- [x] `npm test -- --run src/lib/branchReportApiClient.test.ts` — 4 passed
- [x] Types compile (strict — covered by vitest + tsc in CI)

**Dependencies:** T7 (or mock for local dev)

**Files touched:**
- `frontend/backoffice/src/lib/branchReportApiClient.ts`
- `frontend/backoffice/src/lib/branchReportApiClient.test.ts`
- `frontend/backoffice/src/types/branchReport.ts`

**Estimated scope:** S

---

### Task T10: Royalty21SearchForm

**Description:** Ant Design Form: Channel Type radio (default affiliate), conditional Affiliate Link select, Search/Clear. Load invite links when affiliate channel active (on mount + branch change). **No report fetch on mount.**

**Acceptance criteria:**
- [x] `initialValues.channelType = 'affiliate_link'`
- [x] Affiliate field required when affiliate selected
- [x] Select label `{inviteCode} — {username}` (mapped in page)
- [x] Clear resets form + notifies parent to clear table
- [x] English labels
- [x] Reload invite links on branch change (page `useEffect` on `user.branch_id`)

**Verification:**
- [ ] Manual: validation shows when affiliate selected without link

**Dependencies:** T9

**Files touched:**
- `frontend/backoffice/src/components/branch-report/marketing/Royalty21SearchForm.tsx`

**Estimated scope:** M

---

### Task T11: Royalty21Table + formatters

**Description:** Ant Design Table: fixed Username/Register, scroll cols 1–21, pagination controlled, formatters per spec.

**Acceptance criteria:**
- [x] Columns: Username, Register, Billin, Withdraw, Promotion, Revenue, 1–21
- [x] Promotion always `-`; deposit 0 → `-`; summary 2 decimals
- [x] `scroll.x` + `sticky`; size small
- [x] Empty states: before search vs no results
- [x] pageSize options 20, 50, 100

**Verification:**
- [x] `npm test` — `royalty21Formatters.test.ts` (3 passed)

**Dependencies:** T9

**Files touched:**
- `Royalty21Table.tsx`, `royalty21Columns.tsx`
- `lib/branch-report/royalty21Formatters.ts` + test

**Estimated scope:** M

---

### Task T12: Page, route, menu, branch switch, error states

**Description:** Wire page container, route, menu breadcrumb, permission guard, branch-change handler, and UI states from design doc §5.

**Path resolution:** Canonical path per SPEC is `pages/branch-report/marketing/ChannelPerformancePage.tsx`. Design doc §8 uses a different draft path — **inspect backoffice repo at task start** and align with existing conventions.

**Acceptance criteria:**
- [x] AC-1: menu path Branch Report → Marketing → Channel Performance; route `/branch-report/marketing/channel-performance`
- [x] AC-7: branch switch → reset form (Outlet remount), info toast via `lastBranchSwitchAt`, reload invite links
- [x] AC-9: no report fetch until Search clicked
- [x] Permission `branch-report:marketing:channel-performance:read` on route/menu
- [x] **No active branch:** `Alert type="warning"` — disable search
- [x] **API error:** `message.error()` via `apiErrorMessage`

**Verification:**
- [ ] Manual full flow: select channel → search → paginate → switch branch
- [ ] Manual: no-branch state and API error state
- [x] `npm run build` passes

**Dependencies:** T8, T10, T11

**Files touched:**
- `pages/branch-report/marketing/ChannelPerformancePage.tsx`
- `App.tsx`, `AdminLayout.tsx` (`MENU_UI`), `AuthContext.tsx` (`lastBranchSwitchAt`)

**Estimated scope:** M

---

### Checkpoint CP-5

- [ ] Frontend build passes; core UX works in browser
- [ ] UI states: initial, loading, empty, error, no-branch, branch-switched

---

## Phase 6: Ship

### Task T13: Finalize OpenAPI

**Description:** Complete schemas for row shape, pagination, errors; align with implemented routes.

**Acceptance criteria:**
- [x] Both operations fully documented (descriptions + parameter order per org spectral)
- [x] Response examples in operation descriptions (JSON blocks; inline `example` omitted — Spectral 6.x crash on `message: null`)
- [x] Error responses documented (`INVALID_PARAM`, `INVALID_HEADER`, `GATEWAY_SECRET_REJECTED`, `MISSING_GATEWAY_USER_CONTEXT`)
- [x] Codes aligned with implementation (`MISSING_GATEWAY_USER_CONTEXT`, not stale name)

**Verification:**
- [x] `npm run spec:lint` — 0 errors (`.spectral.yaml` + `@stoplight/spectral-cli`)

**Dependencies:** T6c

**Files touched:**
- `openapi.yaml`, `.spectral.yaml`, `package.json` (`spec:lint`)

**Estimated scope:** S

---

### Task T14: E2E QA checklist (AC mapping)

**Description:** Execute manual QA on dev/staging. Check off each acceptance criterion explicitly.

**Automated / code verification:** recorded in `_mission-control/QA-royalty-21-times.md`

| AC | Automated status |
|---|---|
| AC-1 | Code complete — manual browser pending |
| AC-2 | Code complete + SearchForm validation test |
| AC-3 | Code complete |
| AC-4 | Unit tests passed |
| AC-5 | Integration tests passed |
| AC-6 | Integration tests passed |
| AC-7 | Code complete — manual branch switch pending |
| AC-8 | Integration tests + OpenAPI |
| AC-9 | Code complete — manual network tab pending |

**Additional checks:**
- [x] Cross-branch isolation (integration test filter assertion)
- [x] Invalid `inviteLinkId` → API `INVALID_PARAM` (integration); UI `message.error` wired
- [x] Affiliate search without link → form validation (`Royalty21SearchForm.test.tsx`)

**Verification:**
- [x] QA sign-off recorded in `_mission-control/QA-royalty-21-times.md`
- [ ] Manual browser checklist (section in QA doc) — pending dev stack

**Dependencies:** T12, T7, T13

**Estimated scope:** S

---

### Checkpoint CP-6 (Complete)

- [x] Automated AC evidence documented (AC-4–AC-6, AC-8 partial)
- [ ] All AC-1–AC-9 manually checked in browser
- [ ] SPEC success criteria met (pending manual + auth seed on dev DB)
- [ ] Ready for review (after manual QA + permission seed)

---

## Phase 7: Registration date range filter

### Task T15: `reg-date-range` lib + unit tests

**Description:** Add `src/lib/reg-date-range.js` — parse `regDateFrom` / `regDateTo` (`YYYY-MM-DD`), validate calendar dates, enforce `from ≤ to`, export `toMongoRegDateBounds()` and `currentMonthDateStrings()` for tests/UI parity.

**Acceptance criteria:**
- [x] Valid pair `2024-06-01` … `2024-06-30` → `$gte` UTC midnight, `$lte` UTC end-of-day
- [x] Missing either param → `INVALID_PARAM`
- [x] Invalid date string → `INVALID_PARAM`
- [x] `from > to` → `INVALID_PARAM`
- [x] `currentMonthDateStrings()` returns first/last day of current month as `YYYY-MM-DD`

**Verification:**
- [x] `npm test` — reg-date-range tests pass

**Dependencies:** T6c

**Files likely touched:**
- `src/lib/reg-date-range.js`, `src/lib/reg-date-range.test.js`

**Estimated scope:** S

---

### Task T16: Repository — filter members by `reg_date`

**Description:** Extend member query layer to merge `reg_date` bounds from T15 into `findMembersPage` and `countMembers` filters.

**Acceptance criteria:**
- [x] Same `reg_date` predicate used for list and count
- [x] Bounds applied with channel + tenant filters
- [x] Repository unit tests cover bounded filter object

**Verification:**
- [x] `npm test` — repository tests pass

**Dependencies:** T15

**Files likely touched:**
- `src/lib/channel-filter.js` or `src/lib/reg-date-range.js`
- `src/modules/royalty-21-times/royalty-21-times.repository.js`
- `src/modules/royalty-21-times/royalty-21-times.repository.test.js`

**Estimated scope:** M

---

### Task T17: API — required query params + integration tests

**Description:** Add `regDateFrom`, `regDateTo` to JSON Schema (required); wire through service; extend integration tests.

**Acceptance criteria:**
- [x] Missing reg dates → `400 INVALID_PARAM`
- [x] Inverted range → `400 INVALID_PARAM`
- [x] Happy path returns only members within range
- [x] Existing affiliate / channel tests updated to include reg dates

**Verification:**
- [x] `npm test` — integration suite pass

**Dependencies:** T16

**Files likely touched:**
- `src/modules/royalty-21-times/royalty-21-times.schema.js`
- `src/modules/royalty-21-times/royalty-21-times.service.js`
- `test/royalty-21-times.integration.test.js`

**Estimated scope:** M

---

### Task T18: OpenAPI — document reg-date params

**Description:** Update `openapi.yaml` for required `regDateFrom` / `regDateTo`; run spectral lint.

**Acceptance criteria:**
- [x] Both params documented on `GET /royalty-21-times`
- [x] `npm run spec:lint` — 0 errors

**Verification:**
- [x] `npm run spec:lint`

**Dependencies:** T17

**Files likely touched:**
- `openapi.yaml`

**Estimated scope:** S

---

### Task T19: Frontend — DatePicker search fields

**Description:** Add Register From / To `DatePicker` to `Royalty21SearchForm`; required validation; default current month in `initialValues`; extend types and `getRoyalty21Times` params.

**Acceptance criteria:**
- [x] Labels: **Register From**, **Register To** (English)
- [x] Both required before Search
- [x] API called with `regDateFrom`, `regDateTo` as `YYYY-MM-DD`
- [x] Unit tests for form validation + default month helper

**Verification:**
- [x] `npm test` — SearchForm / helper tests pass

**Dependencies:** T15, T17

**Files likely touched:**
- `src/components/branch-report/marketing/Royalty21SearchForm.tsx`
- `src/lib/branch-report/royalty21DateRange.ts` (or similar)
- `src/types/branchReport.ts`
- `src/lib/branchReportApiClient.ts`

**Estimated scope:** M

---

### Task T20: Page wiring + QA (AC-10)

**Description:** `ChannelPerformancePage` passes reg dates on search/pagination; Clear + branch switch reset to current month; update `QA-royalty-21-times.md` for AC-10; browser smoke.

**Acceptance criteria:**
- [x] Clear restores current-month reg dates (and pageSize 50)
- [x] Branch switch resets reg dates to current month
- [x] Manual/browser: search with month range returns expected subset
- [x] AC-10 validation visible in UI or blocked API call

**Verification:**
- [x] Frontend tests + browser QA on dev

**Dependencies:** T19, T18

**Files likely touched:**
- `src/pages/branch-report/marketing/ChannelPerformancePage.tsx`
- `_mission-control/QA-royalty-21-times.md`

**Estimated scope:** S

---

### Checkpoint CP-7 (Reg-date complete)

- [x] API reg-date validation tests pass
- [x] UI defaults + Clear + branch switch verified (unit tests)
- [x] AC-10 checked in browser
- [x] Ready for review (AC-7 / no-branch visual optional)

---

## Summary table

| ID | Phase | Task | Size | Depends |
|---|---|---|---|---|
| T1 | 1 | Service scaffold (+ headers/error handler) | M | — |
| T2 | 1 | Shared lib + tests | S | T1 |
| T3 | 1 | OpenAPI skeleton | S | T1 |
| T4 | 2 | invite-links API | M | T1,T2 |
| T5 | 3 | Filter + pagination lib | S | T2 |
| T6a | 3 | Member list + count | M | T4,T5 |
| T6b | 3 | Bulk metrics aggregation | M | T6a |
| T6c | 3 | Route wire-up + integration tests | M | T6b |
| T7 | 4 | Gateway route | S | T6c |
| T8 | 4 | Auth permission | S | — |
| T9 | 5 | API client + types | S | T7 |
| T10 | 5 | Search form | M | T9 |
| T11 | 5 | Table + formatters | M | T9 |
| T12 | 5 | Page route menu + error states | M | T8,T10,T11 |
| T13 | 6 | OpenAPI finalize | S | T6c |
| T14 | 6 | E2E QA (AC mapping) | S | T12,T7,T13 |
| T15 | 7 | reg-date-range lib + tests | S | T6c |
| T16 | 7 | Repository reg_date filter | M | T15 |
| T17 | 7 | API schema + integration tests | M | T16 |
| T18 | 7 | OpenAPI reg-date params | S | T17 |
| T19 | 7 | Frontend DatePickers + client | M | T15,T17 |
| T20 | 7 | Page defaults + QA AC-10 | S | T19,T18 |

**Total:** 22 tasks · 7 checkpoints
