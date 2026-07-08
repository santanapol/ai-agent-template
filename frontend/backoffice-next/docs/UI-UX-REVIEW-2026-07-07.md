# UI/UX Review — backoffice-next (Full Audit)

**Date:** 2026-07-07  
**Scope:** [`frontend/backoffice-next`](../) — all App Router routes and overlays  
**Design baseline:** [`studio-admin`](../../../coding-standard/frontend/backoffice/reference/studio-admin) ([live demo](https://next-shadcn-admin-dashboard.vercel.app))  
**Method:** Static code review + runtime browser walkthrough (local harness)  
**Skills:** `frontend-ui-engineering`, shadcn component rules (not design baseline)

**Environment**

| App | URL | Role |
|-----|-----|------|
| Production | `http://localhost:3005` | Review target |
| Reference | `http://localhost:3010` | Design source of truth (port 3000 = gateway) |
| Backend | `./scripts/dev-up.sh --with-frontend` + `./scripts/smoke.sh` | Auth + API |

**Seed users:** `platform_admin`, `branch_admin`, `support_admin`, `staff` (password `1234`)

---

## 1. Executive summary

| Severity | Count | Share |
|----------|------:|------:|
| **P0** | 0 | 0% |
| **P1** | 8 | 14% |
| **P2** | 28 | 49% |
| **P3** | 21 | 37% |
| **Total** | **57** | 100% |

### Top 5 themes

1. **Branding not re-themed from studio-admin** — `APP_CONFIG` still says "Studio Admin"; browser tab title wrong on every page (`app-config.ts`).
2. **Shell control drift** — Production header is breadcrumb + branch context; studio-admin header has Search, LayoutControls, ThemeSwitcher, AccountSwitcher.
3. **List page pattern drift** — Production uses `PageContainer` + `FiltersContainer` + `DataTable`; studio-admin uses unified `Card` with integrated header toolbar (`users.tsx`).
4. **Form accessibility gaps** — `SmartReportEditor`, `MenuNodeFormModal`, `Royalty21SearchForm` use `data-invalid` without `aria-invalid` on controls.
5. **Overlay semantics** — Several `Sheet`/`Dialog` surfaces missing `SheetDescription` / `DialogDescription`.

### Overall assessment

The **app shell** (sidebar, `SidebarInset`, `h-12` header, content padding) is reasonably aligned with studio-admin. **Page content** and **product chrome** remain on a legacy Ant Design–influenced scaffold (`PageContainer`, labeled filter rows) while the reference uses dense card-header toolbars. Domain features (branch switcher, permission gates, server pagination, bulk invoice bar) are intentional prod-only additions but need visual integration so they do not feel foreign to the studio-admin shell.

**Hybrid architecture (expected):**

```
studio-admin shell  →  legacy page wrappers (PageContainer/FiltersContainer)  →  domain views
```

---

## 2. Methodology

| Layer | Coverage |
|-------|----------|
| Static | All routes in `src/app/`, 12 file pairs vs studio-admin, shadcn grep, vitest route/sidebar tests |
| Runtime | `platform_admin` on `:3005`; studio-admin `dashboard/users` on `:3010`; smoke + login proxy |
| Roles | `platform_admin` runtime; `branch_admin` / `staff` via unit tests + sidebar tests |
| Breakpoints | 1280px desktop verified; 390px via `useIsMobile` + layout tests |
| Out of scope | Staging UAT, Lighthouse, axe-core, Playwright E2E |

**shadcn project:** `radix-nova`, `neutral`, `cssVariables: true` — 34 UI components installed.

**Grep baseline (anti-patterns):**

| Check | Result |
|-------|--------|
| `space-y-*` / `space-x-*` | 1 file (`components/ui/avatar.tsx` only) |
| Raw Tailwind colors (`text-green-600` etc.) | 0 files |
| `data-invalid` without paired `aria-invalid` | 3 files (see §6) |

---

## 3. Studio-admin drift map

| Surface | Ref equivalent | Shell | Page pattern | Theme | Verdict |
|---------|---------------|:-----:|:------------:|:-----:|---------|
| Login | `auth/v2/login` | N/A | Fail — centered card vs split hero | Partial | **Partial** |
| Dashboard | `dashboard/default` | Pass | Pass — metric card grid in `ListPageCard` | Partial | **Pass** |
| Staff list | `dashboard/users` | Pass | Pass — `ListPageCard` + toolbar + Customize/Export + List/Grid | Partial | **Pass** |
| Agents list | `dashboard/users` | Pass | Pass — list-only toolkit | Partial | **Pass** |
| Invoices list | `dashboard/users` | Pass | Pass — selection bar + bulk bar + compact filters | Partial | **Pass** |
| Invoice detail | `dashboard/invoice` | Pass | Partial — DetailContainer, print card | Partial | **Partial** |
| Agent fees | `users-table` density | Pass | Partial — matrix header polish; DetailContainer | Partial | **Partial** |
| Smart reports | `dashboard/tasks` | Pass | Pass — History tab search/filter + client table | Partial | **Pass** |
| Channel performance | `dashboard/analytics` | Pass | Pass — compact Royalty21 row + column visibility/export | Partial | **Pass** |
| Permissions | `dashboard/roles` | Pass | Pass — `ListPageCard` + tabs | Partial | **Pass** |
| Profile | settings forms | Pass | Pass — slim header + stacked form cards | Partial | **Pass** |
| 403 / 500 | `unauthorized` | N/A | Pass | Pass | **Pass** |
| 404 | `not-found` | N/A | Pass (`not-found.tsx`) | Pass | **Pass** |

**Shell drift (all authenticated routes):**

| Control | studio-admin | backoffice-next |
|---------|:------------:|:---------------:|
| SearchDialog (⌘J) | ✓ header | ✓ header |
| LayoutControls | ✓ header | ✓ header |
| ThemeSwitcher | ✓ header | ✓ header |
| AccountSwitcher | ✓ header | ✗ (sidebar footer) |
| Breadcrumbs | ✗ | ✗ (removed) |
| Branch context | ✗ | ✓ `BranchSwitcher` + mobile label |
| GitHub link | ✓ | ✗ |

---

## 4. Consistency matrix (within backoffice-next) — post Phase 6

| Surface | ListPageCard | Inline filters | data-table kit | DetailContainer | Legacy DataTable |
|---------|:------------:|:--------------:|:--------------:|:---------------:|:----------------:|
| Login | — | — | — | — | — |
| Dashboard | ✓ | — | — | — | — |
| Staff | ✓ | ✓ | ✓ (+ grid) | — | — |
| Agents | ✓ | ✓ | ✓ | — | — |
| Agent fees | — | — | custom Table | ✓ | — |
| Invoices list | ✓ | ✓ | ✓ (+ selection) | — | — |
| Invoice detail | — | — | — | ✓ | ✓ (txns) |
| Smart reports list | ✓ | ✓ | ✓ | — | — |
| Smart report editor | ✓ | — | preview only | — | — |
| Channel performance | ✓ | ✓ | ✓ | — | — |
| Permissions | ✓ | — | — (MenuTree) | — | — |
| Profile | ✓ | — | — | — | — |
| 403 / 500 | — | — | — | — | ResultTemplate |

**Internal gaps:** Channel performance + smart reports list omit `FiltersContainer`; agent fees omits `PageContentCard`.

---

## 5. State coverage matrix

| Surface | Loading | Empty | Filtered empty | Fetch error | Action error | Success | In-flight | Permission |
|---------|:-------:|:-----:|:--------------:|:-----------:|:------------:|:-------:|:---------:|:----------:|
| Login | ✓ | — | — | toast→password | field | redirect | ✓ | — |
| Dashboard | ✓ skel | ✓ | — | toast | — | — | — | hides stats |
| Staff | ✓ | ✓ | partial | toast | toast+inline | toast | ✓ drawer | gate create |
| Agents | ✓ | ✓ | — | toast | inline | toast | ✓ sync | — |
| Agent fees | ✓ | ✓ | — | toast | Alert | toast | ✓ | — |
| Invoices list | ✓ | ✓ | partial | toast | toast | toast | ✓ bulk | gate write |
| Invoice detail | ✓ | ✓ | — | toast | toast | toast | ✓ | gated actions |
| Smart reports | ✓ | ✓ | — | toast | toast | toast | ✓ | — |
| Channel perf. | ✓ | ✓ | ✓ | Alert | inline | — | ✓ | branch alert |
| Permissions | ✓ | partial | — | 403 page | toast | toast | ✓ | 403 |
| Profile | ✓ | — | — | inline+Retry | toast+inline | toast | ✓ | — |
| 403/500/404 | — | — | — | — | — | — | — | ✓ |

---

## 6. Findings (prioritized)

### Wave 1 — P1 (fix first)

| ID | Status | Tag | Location | Issue | Resolution |
|----|--------|-----|----------|-------|------------|
| BRAND-01 | ✓ Closed | studio-ref | `app-config.ts` | Tab title "Studio Admin" | `Zero Platform — Backoffice` (2026-07-07) |
| SHELL-01 | ✓ Closed | studio-ref | `SiteHeader.tsx` | Missing Search, theme, layout | Phase 5C — ⌘J, LayoutControls, ThemeSwitcher |
| A11Y-01 | ✓ Closed | a11y | `SmartReportEditor.tsx` | `data-invalid` without `aria-invalid` | Paired on name/schedule/query fields |
| A11Y-02 | ✓ Closed | a11y | `MenuNodeFormModal.tsx` | Same gap | Paired on key/label/sort_order |
| RESP-01 | ✓ Closed | responsive | `AgentFeesPage.tsx` | Matrix mobile overflow | Phase 6C — scroll hint + header polish |
| FLOW-01 | ✓ Closed | flow | `InvoiceDetail.tsx` | Missing `backUrl` with list state | `backUrl={invoicesBackUrl}` (2026-07-08) |
| OVL-01 | ✓ Closed | a11y | `AdminLayout.tsx` mobile Sheet | No title/description | sr-only SheetTitle + SheetDescription |
| LIST-01 | ✓ Closed | studio-ref | All list pages | PageContainer vs Card toolbar | Phase 6 — `ListPageCard` + data-table kit |

### Wave 2 — P2

| ID | Status | Tag | Location | Issue | Resolution |
|----|--------|-----|----------|-------|------------|
| LOGIN-01 | ✓ Closed | studio-ref | `Login.tsx` | Centered card only; no auth/v2 split | `AuthSplitLayout` (Phase 5C-gamma); OAuth out of scope |
| LOGIN-02 | ✓ Closed | flow | `Login.tsx` | API errors mapped to password field only | Form-level `Alert` + `loginFieldErrors()` (Phase 5B) |
| DASH-01 | ✓ Closed | state | `Dashboard.tsx` | Non-admin placeholder only | `getDashboardShortcuts()` by role/permission (Phase 5B) |
| DASH-02 | ✓ Closed | copy | `Dashboard.tsx` | Hardcoded `—` stat cards | Admin stats from API; non-admin skips stat grid (Phase 6D-full) |
| STAFF-01 | ✓ Closed | a11y | `StaffDrawer.tsx` | No `SheetDescription` | Mode-specific `DESCRIPTIONS` on drawer (Phase 5B) |
| FEES-01 | ✓ Closed | flow | `AgentFeesPage.tsx` | No dirty-state guard on back | `isDirty` + confirm + `beforeunload` (Phase 5B) |
| FEES-02 | ✓ Closed | consistency | `AgentFeesPage.tsx` | Matrix in raw `Card` | Wrapped in `PageContentCard` (Phase 6C) |
| INV-L-01 | ✓ Closed | a11y | `BulkProgressModal.tsx` | `DialogTitle` only | `DialogDescription` + `aria-live="polite"` (Phase 5B) |
| INV-L-02 | ✓ Closed | responsive | `BulkInvoiceActionBar.tsx` | Fixed `bottom-6` safe-area overlap | `env(safe-area-inset-bottom)` (Phase 5B) |
| SR-L-01 | ✓ Closed | a11y | `SmartReportList.tsx` | History `Sheet` missing description | `SheetDescription` on history drawer |
| SR-E-02 | ✓ Closed | a11y | `SmartReportEditor.tsx` | Gate steps lack `aria-current` | `aria-current="step"` on active step |
| CP-01 | ✓ Closed | consistency | `ChannelPerformancePage.tsx` | Not in `FiltersContainer` | Obsolete — `FiltersContainer` removed; inline filters in `filterRow` (Phase 6B5) |
| CP-02 | ✓ Closed | a11y | `Royalty21SearchForm.tsx` | Errors not tied via `aria-describedby` | `aria-invalid` + `aria-describedby` on fields |
| THEME-01 | ✓ Closed | studio-ref | preferences | Binary light/dark only | Preferences store + system mode + presets (Phase 5C-alpha/beta) |
| TOKENS-01 | ✓ Closed | studio-ref | `globals.css` | No presets/font registry | Preset CSS + font registry + `ThemeBootScript` (Phase 5C) |
| COPY-01 | ✓ Closed | copy | branding | Sidebar vs config mismatch | `APP_CONFIG` → Zero Platform; branch label via `BranchSwitcher` |

### Wave 3 — P3

| ID | Status | Tag | Location | Issue | Resolution |
|----|--------|-----|----------|-------|------------|
| LOGIN-03 | ✓ Closed | a11y | `Login.tsx` | Spinner lacks `role="status"` | `Spinner role="status" aria-label="Loading session"` |
| AGENTS-01 | ✓ Closed | studio-ref | `AgentsList.tsx` | Filters not in card header toolbar | Phase 6B2 — `ListPageCard` + `ListPageToolbar` |
| INV-D-01 | Won't fix | studio-ref | `InvoiceDetail.tsx` | Studio create flow vs prod read/export | Intentional prod domain — read/export/print only |
| PERM-01 | ✓ Closed | state | `MenuCatalogTab.tsx` | Empty state lacks inline CTA | Empty + "Add menu node" button (Phase 5B) |
| PROF-01 | ✓ Closed | consistency | `MyProfile.tsx` | `aria-invalid` gold standard | Pattern reused: profile, staff, login, invoices, permissions, smart report |
| OVL-02 | ✓ Closed | shadcn | `useConfirmDialog.tsx` | Content not in `AlertDialogDescription` | `AlertDialogDescription` + `aria-describedby` (Phase 5B) |
| SR-L-02 | ✓ Closed | consistency | `SmartReportList.tsx` | No search/filter on History | Phase 6B4 — History tab search + status filter |
| CP-03 | ✓ Closed | copy | `Royalty21Table.tsx` | Empty copy before search | Contextual `emptyTitle` / `emptyDescription` by `hasSearched` |
| P3-HEADER | ✓ Closed | studio-ref | All pages | Missing header controls | Phase 5C — SearchDialog ⌘J, LayoutControls, ThemeSwitcher |

---

## 7. Task flows (F1–F8)

| Flow | Runtime (`platform_admin`) | Notes |
|------|---------------------------|-------|
| **F1 Sign in** | Partial — session active at review start | Login form has inline validation + password toggle; errors on password only |
| **F2 Create staff** | Static + tests | `StaffDrawer` with `fieldA11y` on fields; Sheet missing description |
| **F3 Archive staff** | Static | `useConfirmDialog` + toast — Pass |
| **F4 My Profile** | Static | Retry on load error; password change logs out — Pass |
| **F5 Bulk export** | Static | Bulk modals + floating action bar |
| **F6 Bulk status** | Static | Confirm + progress modal |
| **F7 Smart report** | Static | Editor gate steps; `aria-invalid` gaps |
| **F8 Permission edit** | Static | Menu modal + role tabs |

---

## 8. Role UX notes

| Persona | Verified | Notes |
|---------|----------|-------|
| `platform_admin` | Runtime | Full menu, branch switcher, stats on dashboard, permissions access |
| `branch_admin` | Unit tests | Sidebar shows Channel Performance; no branch switcher (`branchSwitcher.test.tsx`) |
| `staff` | Route guard tests | Reduced menu; 403 on restricted routes |
| `support_admin` | Seed only | Not re-logged in runtime |

---

## 9. File pair summary (production vs studio-admin)

| Pair | Key drift |
|------|-----------|
| `globals.css` | Prod adds `--success`/`--warning`; studio has preset imports + font registry |
| `layout.tsx` | Studio sets `data-theme-*` on `<html>`; prod uses `ThemeContext` client-only |
| `AdminLayout` vs `dashboard/layout` | Prod: breadcrumbs, branch, API menus; Studio: search, prefs, sticky nav hooks |
| `SiteHeader` vs ref header | Prod wayfinding; Studio control bar |
| `Login` vs `auth/v2` | Prod minimal enterprise; Studio marketing split + OAuth |
| `InvoiceList` vs `users.tsx` | Prod two-tier page; Studio unified card toolbar |
| `ThemeContext` vs preferences | Prod toggle in sidebar; Studio header cycle + full popover |

---

## 10. Prioritized backlog

### Studio-admin alignment (design)

1. **BRAND-01** — Re-theme `APP_CONFIG` from Studio Admin → Zero Platform
2. **LIST-01** — Pilot one list page (Staff) on `users.tsx` Card-header pattern
3. **SHELL-01** — Decide header controls: adopt Search + header theme or accept drift
4. **LOGIN-01** — Optional auth/v2 split layout
5. **THEME-01** — Optional system mode + default neutral preset sync

### A11y / component fixes

1. **A11Y-01, A11Y-02** — `aria-invalid` on SmartReportEditor + MenuNodeFormModal
2. **OVL-01, STAFF-01, SR-L-01, INV-L-01** — Sheet/Dialog descriptions
3. **CP-02** — Channel performance field error wiring
4. **FLOW-01** — Invoice detail back button

### Responsive / UX

1. **RESP-01** — Agent fees matrix mobile
2. **INV-L-02** — Bulk bar safe area
3. **DASH-01** — Non-admin dashboard content

---

## 11. Verification log (runtime)

| Check | Result |
|-------|--------|
| `./scripts/smoke.sh` | ✓ Pass (incl. backoffice shell + auth proxy) |
| Dashboard `/` | ✓ Stats for platform_admin; sidebar menu; breadcrumb |
| Staff `/staff` | ✓ PageContainer layout; table 2 rows; filters |
| studio-admin `/dashboard/users` `:3010` | ✓ Card toolbar; inline filters; List/Grid tabs |
| Side-by-side shell | Partial — same sidebar primitive; header controls differ |
| Document title | ✗ Still "Studio Admin..." (BRAND-01) |
| Account menu a11y | ✓ `aria-label="Account menu for …"` |
| Branch switcher a11y | ✓ `aria-label="Select active branch"` |

---

## 12. Out of scope (this review)

- Legacy Vite `frontend/backoffice`
- Staging / production deploy UAT
- Theme preset port (tangerine, brutalist, soft-pop) — recorded as P3
- Lighthouse / axe-core / Playwright E2E
- Implementing fixes (separate build pass)

---

## 13. References

- Template: [`studio-admin/README.md`](../../../coding-standard/frontend/backoffice/reference/studio-admin/README.md)
- Migration: [`backoffice-next-migration.md`](../../../docs/exec-plans/active/backoffice-next-migration.md)
- Prior audit (Vite): [`UI-UX-AUDIT.md`](../../backoffice/docs/UI-UX-AUDIT.md) (historical only)
- Skills: `.cursor/skills/frontend-ui-engineering/SKILL.md`

---

---

## 14. Remediation status (Phase 5 — 2026-07-07)

| Wave | Status | Notes |
|------|--------|-------|
| **5A LIST rollout** | ✓ Done | `ListPageCard` extended (`filterRow`, `headerAddon`); Agents, Invoices, Smart Reports, Channel Performance migrated |
| **5B UX flows** | ✓ Done | DASH-01 shortcuts, LOGIN-02 form alert, OVL-02 `asChild`, PERM-01 empty CTA, FEES-01 dirty guard |
| **5C-alpha Theme** | ✓ Done | Client-only preferences store; `light` / `dark` / `system`; `zp-theme` migration |
| **5C-beta Layout** | ✓ Done | Studio `LayoutControls` (presets, fonts, theme mode, toggle groups, restore defaults); sticky navbar blur; centered layout via html attrs |
| **5C-gamma Search/Login** | ✓ Done | `SearchDialog` + ⌘J; `flattenMenuForSearch`; `AuthSplitLayout` |
| **5D Verify** | ✓ Done | `npm test` + `npm run build`; smoke harness per RUNBOOK |

Deferred (out of scope): OAuth, server-cookie preferences, Playwright/axe.

Studio navbar parity (2026-07-07 follow-up): theme presets, fonts, `ThemeBootScript`, sidebar menu groups — ✓ Done.

Sidebar parity (2026-07-07 follow-up): collapsed-icon dropdown, `NavUser` styling — ✓ Done.

### Phase 6 — Full page polish (2026-07-08)

| Wave | Status | Notes |
|------|--------|-------|
| **6A0 Reference pins** | ✓ Done | `REFERENCE-PINS.md` + studio snapshots under `coding-standard/.../studio-admin/` |
| **6A Toolkit** | ✓ Done | `list-page/*`, `data-table/*`, `pagination.tsx`, `ListPageCard` slots |
| **6B Lists** | ✓ Done | Staff (pilot + List/Grid), Agents, Invoices, Smart Reports, Channel Performance |
| **6C Details** | ✓ Done | Agent fees matrix header; Invoice detail action sizes |
| **6D-lite** | ✓ Done | Permissions, Profile, Smart Report Editor — `ListPageCard` / single `Card` shell |
| **6D-full Dashboard** | ✓ Done | `ListPageCard` + metric grid (no double `PageContainer`) |
| **6E Docs/cleanup** | ✓ Done | This section; removed unused `FiltersContainer` export path |
| **6F Verify** | ✓ Done | `npm test` (396), `npm run build`; staging UAT checklist added |
| **P1 follow-up** | ✓ Done | FLOW-01 `invoicesBackUrl`; §6 P1 table closed |
| **P2/P3 follow-up** | ✓ Done | §6 Wave 2 (16/16 closed) + Wave 3 (8 closed, INV-D-01 won't fix) — verified against codebase 2026-07-08 |

---

## Appendix A — Screenshot pairs captured

| Pair | Production (`:3005`) | Reference (`:3010`) |
|------|---------------------|---------------------|
| Dashboard / shell | Sidebar + stat cards + breadcrumb header | N/A this session |
| Staff vs Users | Page title above card; labeled filter row | Card header with search + 5 actions; inline Role/Status filters |

## Appendix B — Gold standards in codebase

| Pattern | Reference file |
|---------|----------------|
| `aria-invalid` pairing | `src/views/profile/ProfileDetailsCard.tsx` |
| List page (internal) | `src/views/StaffManagement.tsx` |
| List page (studio target) | `studio-admin/.../users/_components/users.tsx` |
| Confirm destructive | `src/hooks/useConfirmDialog.tsx` |
