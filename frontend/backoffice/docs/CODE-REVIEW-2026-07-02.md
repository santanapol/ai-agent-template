# Code Review — backoffice

**Date:** 2026-07-02  
**Branch / base:** `feature/backoffice-shadcn-migration` @ `cc672fe` (+ working tree)  
**Scope:** D1–D6 (test infra, page tests, shell refactor, expanded tests, router, production pages)  
**Reviewer:** code-reviewer (5-axis + test-first)  
**Verdict:** **Request Changes**

## Executive summary

This change set delivers broad Vitest coverage (~370 tests), a substantial AdminLayout decomposition into layout components, and production fixes (invoice permission gating, detail confirm dialogs, branch-option caching, data-table indeterminate selection). Test runtime passes, but **`npm run build` and `npm run lint` fail** — the production TypeScript project includes all `src/**/*.test.tsx` files, and several new/updated tests have type and lint errors. `App.routes.test.tsx` duplicates a minimal router instead of exercising `App.tsx`, so route/permission drift risk remains for 10+ guarded routes.

---

## Baseline — changed files by domain

**`git diff --stat HEAD` (backoffice + siblings in same working tree):** 35 files, +1074 / −637 lines (includes out-of-scope backend/agent-invoice and AntD sibling).

### D1 — Test infrastructure

| Status | Path |
|--------|------|
| M | `src/setupTests.ts` |
| M | `src/test/renderWithProviders.tsx` |
| ?? | `src/test/mockFactories.ts` |
| ?? | `src/test/renderWithRouter.tsx` |
| ?? | `src/test/renderWithRouter.test.tsx` |

### D2 — New page tests (Tracks A–C)

| Status | Path |
|--------|------|
| ?? | `src/pages/Error403.test.tsx`, `Error404.test.tsx`, `Error500.test.tsx` |
| ?? | `src/pages/Dashboard.test.tsx` |
| M | `src/pages/Login.test.tsx` |
| ?? | `src/pages/Invoices/index.test.tsx` |
| ?? | `src/pages/Agents/index.test.tsx` |
| ?? | `src/pages/MyProfile.test.tsx` |
| ?? | `src/pages/AgentFees/index.test.tsx` |
| ?? | `src/pages/SmartReport.test.tsx` |

### D3 — Shell + layout refactor

| Status | Path |
|--------|------|
| M | `src/layouts/AdminLayout.tsx` |
| ?? | `src/contexts/PageBreadcrumbContext.tsx` |
| ?? | `src/components/layout/app-sidebar.tsx`, `branch-switcher.tsx`, `nav-main.tsx`, `nav-user.tsx`, `site-header.tsx` |
| ?? | `src/components/layout/*.test.tsx`, `src/layouts/AdminLayout.navbar.test.tsx` |
| M | `src/components/layout/DetailContainer.tsx` |

### D4 — Expanded tests (Track E)

| Status | Path |
|--------|------|
| M | `src/pages/StaffManagement.test.tsx` |
| M | `src/pages/Invoices/InvoiceDetail.test.tsx` |
| M | `src/pages/PermissionAdmin/PermissionAdmin.test.tsx` |
| M | `src/pages/branch-report/marketing/ChannelPerformancePage.test.tsx` |
| M | `src/layouts/AdminLayout.test.tsx`, `AdminLayout.sidebar.test.tsx`, `AdminLayout.branchSwitcher.test.tsx` |

### D5 — Router + layout types

| Status | Path |
|--------|------|
| ?? | `src/App.routes.test.tsx` |
| ?? | `src/components/layout/types.ts`, `types.test.ts` |

### D6 — Production pages + shared UI

| Status | Path |
|--------|------|
| M | `src/pages/Invoices/index.tsx`, `InvoiceDetail.tsx`, `utils.ts`, bulk components |
| M | `src/pages/Agents/index.tsx`, `src/pages/AgentFees/index.tsx` |
| M | `src/lib/branchOptions.ts`, `branchOptions.test.ts` |
| M | `src/components/data-table.tsx`, `filter-select.tsx`, `filter-select-field.tsx` |
| M | `src/components/ui/checkbox.tsx`, `month-picker.tsx`, `StaffTable.tsx`, `index.css` |
| M | `package.json`, `package-lock.json` |

**Out of scope (not reviewed as merge blockers):** `backend/service/agent-invoice/*`, `frontend/backoffice` (AntD).

---

## Findings by domain

### D1 — Test infrastructure

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/test/mockFactories.ts:8` | `permissions` parameter is declared but never used — ESLint `@typescript-eslint/no-unused-vars` and `tsc` `noUnusedParameters` both fail. | Prefix with `_permissions` or wire into `mockAuthUser` return / a `mockAuthContextValue()` helper that sets `permissions` on `AuthContextValue`. |
| **Suggestion** | `src/setupTests.ts:5-11` | Global `StrictMode` noop reduces dev/prod parity; acceptable for stability but hides double-effect bugs. | Document intent in a one-line comment; consider per-suite opt-in instead of global disable. |
| **Suggestion** | `src/test/renderWithRouter.tsx:27-28` | `SidebarProvider` wraps inside `MemoryRouter`; order is fine for current tests but differs from app (`SidebarProvider` is in `AdminLayoutShell`). | No change required now; note if shell integration tests need outer `SidebarProvider`. |
| **Nit** | `src/test/renderWithProviders.tsx` | Good addition of `ConfirmDialogProvider` — existing tests still pass. | — |

**Axes:** Correctness ✓ · Readability ✓ · Architecture ✓ · Security ✓ (no secrets in factories) · Performance ✓

---

### D2 — New page tests (A–C)

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/pages/SmartReport.test.tsx:14-31,67,73-74,103,119` | Multiple TS errors: missing `upd_prog` on `Report`, mock responses missing `pagination`, unused `deleteReport`. Blocks `tsc -b`. | Add `upd_prog: 'smart-report'` to `sampleReport`; use `mockPaginatedResponse([])` or `{ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }`; remove or use `deleteReport`. |
| **Important** | `src/pages/Invoices/index.test.tsx:113-118` vs `src/pages/Invoices/index.tsx:76,308-314` | **R-01 cross-check:** Test asserts Create hidden without `invoices:write`; production **does** gate via `canWrite`. Audit (2026-07-01) is **stale** — not a test/prod mismatch. | Close R-01 after verifying seed permissions for `platform_admin` (wildcard `invoices:*` should show button). Update `UI-UX-AUDIT.md` state matrix. |
| **Suggestion** | `src/pages/SmartReport.test.tsx` (whole file) | List mode only; editor (~1300 LOC) untested per plan. | Add focused editor tests or document explicit gap. |
| **Suggestion** | `src/pages/Dashboard.test.tsx:42-44` | Partial `useAuth` mock (`as ReturnType<typeof useAuth>`) — same pattern as other tests; works at runtime but weak typing. | Introduce `mockAuthContext(overrides)` factory with full `AuthContextValue` shape. |
| **Nit** | `src/pages/Agents/index.test.tsx`, `Login.test.tsx` | Behavior-oriented names and DOM assertions — good characterization style. | — |

**Axes:** Correctness ✓ (R-01 resolved in prod) · Readability ✓ · Architecture ✓ · Security ✓ (test passwords are fixtures, not real secrets) · Performance ✓

---

### D3 — Shell + PageBreadcrumbContext + AdminLayout refactor

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/components/layout/site-header.test.tsx:11,28,58` | `SidebarBreadcrumb` requires `parent` and `page`; tests pass partial objects — **build fails**. | Add `parent: null` and `page: 'Dashboard'` to all fixtures; for `items` override use full object or make `parent`/`page` optional when `items` is set. |
| **Suggestion** | `src/layouts/AdminLayout.tsx:392-407` | `sidebarProps` duplicates `navUserProps` callbacks (`onLogout`, `onProfile`, `onToggleTheme`). | Spread `navUserProps` into `sidebarProps` to avoid drift. |
| **Suggestion** | `src/layouts/AdminLayout.navbar.test.tsx` | TEST-RUN claims navbar covers logout/profile/theme; file only tests breadcrumb, nav click, sidebar trigger, profile fetch. | Coverage is in `nav-user.test.tsx` — align TEST-RUN wording. |
| **Suggestion** | `src/contexts/PageBreadcrumbContext.tsx:34-45` | `usePageBreadcrumb` throws outside provider — good; `items` array identity changes re-run effect every render if caller inline-creates array. | Callers already use `useMemo` in `InvoiceDetail` — OK. |
| **Nit** | `src/components/layout/site-header.tsx:90` | CC-01 fixed: `aria-label="Open navigation menu"`. | — |
| **Nit** | `src/components/layout/nav-user.tsx:52` | CC-02 fixed: `aria-label` on account trigger. | — |
| **Nit** | `src/components/layout/types.ts:26-30` | `isDetailRoute` + `resolveSidebarBreadcrumb` avoid raw Mongo id in crumbs — addresses audit breadcrumb issue for layout slot. | — |

**Axes:** Correctness ✓ · Readability ✓ (large reduction in AdminLayout LOC) · Architecture ✓ (components under `components/layout/`) · Security ✓ · Performance ✓ (`useMemo` for menu/breadcrumb; branch fetch dedup preserved)

---

### D4 — Expanded tests (Track E)

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/pages/Invoices/InvoiceDetail.test.tsx:81` | Uses `beforeEach` without importing from `vitest` — **build fails**. | Add `beforeEach` to import on line 1. |
| **Important** | `src/pages/PermissionAdmin/PermissionAdmin.test.tsx:68` | `const axios = await import('axios')` assigned but never used — lint + tsc error. | Remove binding; use `import type { AxiosError, InternalAxiosRequestConfig } from 'axios'` and construct error inline. |
| **Suggestion** | `ChannelPerformancePage.test.tsx`, `StaffManagement.test.tsx`, `PermissionAdmin.test.tsx`, `AgentFees/index.test.tsx` | `act(...)` warnings in stderr — tests pass but async state updates not wrapped. | `await waitFor` after mount or wrap fire-and-forget effects; use `findBy*` queries. |
| **Nit** | `src/pages/Invoices/InvoiceDetail.test.tsx:127-164` | Confirm-before-paid/cancel tests — **closes audit gap** (destructive detail actions now use `useConfirmDialog`). | — |

**Axes:** Correctness ✓ · Readability ✓ · Architecture ✓ · Security ✓ · Performance ✓

---

### D5 — Router + types

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/App.routes.test.tsx:35-62` vs `src/App.tsx:40-137` | **Duplicate router** — tests only dashboard guard + catch-all; does not assert paths/permissions for `profile`, `invoices`, `agents`, `staff`, `smart-reports`, `permissions`, `channel-performance`, `/500`. Drift risk on future route edits. | Export `router` config from `App.tsx` (or `routes.tsx`) and mount with `createMemoryRouter` + `RouterProvider`, **or** add parameterized table test mirroring every `PermissionGuard required=` string. |
| **Important** | `src/App.routes.test.tsx:68-73,91-96,107-112` | Incomplete `AuthContextValue` mocks — `tsc` rejects casts (missing `menus`, `branchSwitching`, etc.). | Use shared `mockAuthContextValue(overrides)` satisfying full interface. |
| **Suggestion** | `src/App.routes.test.tsx:130-132` | `errorElement` test only checks `RouteErrorPage` is defined — no render assertion. | Render a route that throws and assert 404/500 UI. |
| **Nit** | `src/components/layout/types.test.ts:27-37` | Good edge-case coverage for invoice detail breadcrumb resolution. | — |

**Axes:** Correctness △ (router parity) · Readability ✓ · Architecture △ (duplicate router anti-pattern) · Security △ (RBAC not fully regression-tested) · Performance ✓

---

### D6 — Production pages + shared UI

| Sev | Location | Issue | Fix |
|-----|----------|-------|-----|
| **Important** | `src/pages/Invoices/index.tsx:169-172` | ESLint `react-hooks/preserve-manual-memoization`: `useMemo` deps `[branches, invoices, user?.ou_id]` vs compiler-inferred `user`. | Use `[branches, invoices, user]` or `user?.ou_id` consistently; align with React Compiler rules. |
| **Important** | `tsconfig.app.json:28` | `"include": ["src"]` pulls **all test files into production `tsc -b`** — any test type error blocks release build. | Add `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]` **or** fix all test types (both needed for hygiene). |
| **Suggestion** | `src/lib/branchOptions.ts:100-167` | Module-level caches (`cachedBranchesByOu`, `cachedMyBranch`) — correct for UX; ensure `clearBranchCaches` called on logout (verify `AuthContext`). | Grep `clearBranchCaches` on logout path; add test if missing. |
| **Suggestion** | `src/components/data-table.tsx:236-241` | Indeterminate header checkbox + `pageSizeOptions` on invoice list — intentional UX improvement. | — |
| **Suggestion** | `src/pages/Invoices/InvoiceDetail.tsx:179-198` | Confirm dialogs added for status transitions — addresses UI-UX-AUDIT destructive-action gap on detail page. | — |
| **Nit** | `src/pages/Invoices/index.tsx:308-314` | Create button gated by `canWrite` — **R-01 fixed in production** relative to audit. | Update audit doc. |

**Axes:** Correctness ✓ · Readability ✓ · Architecture ✓ · Security ✓ (permission gates on write actions) · Performance ✓ (memoized branch lists, paginated tables)

---

## Cross-cutting (5 axes)

| Axis | Assessment |
|------|------------|
| **Correctness** | Runtime behavior improvements (invoice gating, detail confirms, breadcrumb resolution). Blocked by **build/type failures** in test layer included in app tsconfig. |
| **Readability** | AdminLayout decomposition and test helpers (`renderWithRouter`, `mockFactories`) are clear; some mock duplication remains. |
| **Architecture** | Layout extraction follows `2-folder-structure`; duplicate router in `App.routes.test` is the main structural debt. |
| **Security** | No hardcoded production secrets in new tests; RBAC gates present on invoice write UI; `PermissionGuard` pattern consistent with `App.tsx`. Router test gap weakens RBAC regression safety. |
| **Performance** | No N+1 or unbounded list issues introduced; branch cache reduces refetch; test suite ~37s for 370 tests (within TEST-RUN budget). |

---

## Meta — coverage map (R8)

| Route (`App.tsx`) | Permission | Test file(s) | Gap |
|-------------------|------------|--------------|-----|
| `/login` | — | `Login.test.tsx` | — |
| `/` | `dashboard:view` | `Dashboard.test.tsx`, `App.routes.test.tsx` | App.routes only |
| `/profile` | `my_profile` | `MyProfile.test.tsx` | Not in App.routes |
| `/invoices` | `invoices:list` | `Invoices/index.test.tsx` | Not in App.routes |
| `/invoices/:id` | `invoices:read` | `InvoiceDetail.test.tsx` | Not in App.routes |
| `/agents` | `agents:list` | `Agents/index.test.tsx` | Not in App.routes |
| `/agents/:id/fees` | `agents:fees` | `AgentFees/index.test.tsx` | Not in App.routes |
| `/staff` | `profiles:list` | `StaffManagement.test.tsx` | Not in App.routes |
| `/smart-reports` | `reports:smart` | `SmartReport.test.tsx` | Editor mode untested |
| `/branch-report/.../channel-performance` | `branch-report:marketing:channel-performance:read` | `ChannelPerformancePage.test.tsx` | Not in App.routes |
| `/permissions` | `permissions:manage` | `PermissionAdmin.test.tsx` | Not in App.routes |
| `/403` | — | `Error403.test.tsx`, `App.routes.test.tsx` | — |
| `/500` | — | `Error500.test.tsx` | Not in App.routes |
| `/404`, `*` | — | `Error404.test.tsx`, `App.routes.test.tsx` | — |

**Anti-patterns:** duplicate minimal router (`App.routes.test`), partial `AuthContext` mocks, global StrictMode disable, `act` warnings in async mount tests.

**Flaky / slow (>5s individual):** None failed; slowest suites ~4–5s (`RolePermissionsTab`, `MenuCatalogTab`, `branchSwitcher`) — acceptable.

---

## Follow-ups (linked to UI-UX-AUDIT / TEST-RUN)

- [ ] **R-01** — Production gates Create with `invoices:write` (`index.tsx:308`). Test aligns. **Close audit item** after seed permission check; browser visibility for `platform_admin` is expected if wildcard granted.
- [ ] **R-02** — Mobile branch switcher still hidden on desktop header path; mobile sheet includes `BranchSwitcher` — partial fix; manual 390px pass still deferred (TEST-RUN).
- [ ] **CC-03** — Breadcrumb duplication (layout + page h1) — not addressed; `PageBreadcrumbContext` improves detail override only.
- [ ] **CC-04** — Sonner / `ThemeContext` desync — out of this diff scope.
- [ ] **TEST-RUN** — Claims `npm test` 370/370 ✓ validated; does **not** claim build — build was not run in TEST-RUN. Account menu / F1 logout still partial in browser section.
- [ ] **Build gate** — Add `npm run build` to TEST-RUN DoD before merge.

---

## What's done well

- Comprehensive route-level page tests with behavior-focused assertions (loading, empty, permission, navigation).
- AdminLayout refactor preserves behavior (`Outlet key={branch_id}`, branch switch optimistic rollback, menu tree building) while fixing CC-01/CC-02 a11y on shell controls.
- `InvoiceDetail` confirm dialogs and `Invoices/index` write gate close high-severity audit findings.
- `branchOptions` extraction with tests (18 cases) and HQ merge semantics.
- `vi.hoisted` used appropriately in `AgentFees` / `SmartReport` / `ChannelPerformance` to avoid mock hoisting pitfalls.

---

## Verification

| Command | Result | Notes |
|---------|--------|-------|
| `npm test` | **PASS** | 370/370 tests, 64 files, ~36.9s |
| `npm run lint` | **FAIL** | 4 errors, 6 warnings |
| `npm run build` | **FAIL** | 14 TypeScript errors |

### Lint errors (must fix)

1. `src/pages/PermissionAdmin/PermissionAdmin.test.tsx:68` — unused `axios`
2. `src/pages/SmartReport.test.tsx:67` — unused `deleteReport`
3. `src/test/mockFactories.ts:8` — unused `permissions` param
4. `src/pages/Invoices/index.tsx:169` — `react-hooks/preserve-manual-memoization`

### Build errors (must fix)

- `App.routes.test.tsx` — incomplete `AuthContextValue` casts (2)
- `site-header.test.tsx` — missing `parent` on `SidebarBreadcrumb` (3)
- `InvoiceDetail.test.tsx` — `beforeEach` not imported (1)
- `PermissionAdmin.test.tsx` — unused `axios` (1)
- `SmartReport.test.tsx` — type mismatches on `Report`, pagination mocks (6)
- `mockFactories.ts` — unused `permissions` (1)

### TEST-RUN claims validated

| Claim | Validated |
|-------|-----------|
| 370 tests pass | **Yes** |
| Every route has ≥1 test file | **Yes** (page-level; App.routes partial) |
| Shell component dedicated tests | **Yes** |
| Browser walkthrough | Not re-run this review |
| `npm run build` | **No** — fails |

---

## Verdict rationale

**Request Changes** — Review DoD requires passing `npm test`, `npm run lint`, and **`npm run build`**. Tests pass at runtime, but the release build and linter fail due to type/lint issues in new test files and one production `useMemo` lint error. Router regression coverage (`App.routes.test`) remains a duplicate subset of `App.tsx` and should be strengthened before relying on it for permission drift detection.

**Not blocking on R-01:** Production and tests agree on write gating; UI-UX-AUDIT entry is outdated.

---

## Recommended fix order

1. Fix all **build/lint errors** (mockFactories, SmartReport.test, site-header.test, InvoiceDetail.test, PermissionAdmin.test, Invoices `useMemo` deps).
2. Exclude `*.test.*` from `tsconfig.app.json` **or** enforce test types in CI separately.
3. Replace duplicate router in `App.routes.test.tsx` with exported route table tests.
4. Update `UI-UX-AUDIT.md` R-01 + state matrix; add `npm run build` to TEST-RUN DoD.

---

## Resolution (2026-07-02)

**Verdict updated:** **Approve**

Merge-ready fixes applied in three phases:

| Phase | Scope | Outcome |
|-------|-------|---------|
| A | Build/lint blockers | `mockFactories` (`_permissions`, `mockAuthContextValue`), test fixes (SmartReport, site-header, InvoiceDetail, PermissionAdmin), `Invoices/index.tsx` useMemo deps, `tsconfig.app.json` test exclude |
| B | Router regression | `routeGuardMatrix.ts` (10 PermissionGuard routes) + `App.routes.test.tsx` parameterized allow/deny + `/500` stub |
| C | Docs sync | UI-UX-AUDIT resolution log, TEST-RUN DoD + §6 verification, this section |

### Verification after fix

| Command | Result |
|---------|--------|
| `npm test` | PASS — 389 tests |
| `npm run lint` | PASS — 0 errors (6 warnings) |
| `npm run build` | PASS — 0 TypeScript errors |

### Outstanding (non-blocking)

- Manual browser: `/403`, `/500`, account menu logout, mobile 390px
- CC-03 breadcrumb duplication, CC-04 sonner theme
- INV-02 partial (raw `_id` breadcrumb may remain)
- `act(...)` warnings in expanded tests
- Export real router from `App.tsx` (follow-up)
