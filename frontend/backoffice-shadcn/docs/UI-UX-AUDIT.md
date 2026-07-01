# UI/UX Audit — backoffice-shadcn

**Date:** 2026-07-01  
**Branch:** `feature/backoffice-shadcn-migration` (commit `34ae895`)  
**Scope:** All routes and overlays in `frontend/backoffice-shadcn`  
**Benchmark:** UI Skills only — `baseline-ui`, `fixing-accessibility`, `shadcn` (via `/ui-skills-root`)  
**Method:** Static code review (18 surface groups) + browser walkthrough (`http://localhost:5175`, seed `platform_admin` / `1234`)

---

## 1. Executive summary

| Severity | Count | Share |
|----------|------:|------:|
| **P0 Critical** | 6 | 5% |
| **P1 High** | 28 | 24% |
| **P2 Medium** | 52 | 45% |
| **P3 Low** | 30 | 26% |
| **Total** | **116** | 100% |

### Top 5 themes

1. **Form accessibility incomplete** — `Field data-invalid` without `aria-invalid` / `aria-describedby` on controls (Staff drawer, My Profile, Smart Report editor).
2. **Duplicate wayfinding** — Layout breadcrumbs + page `h1` on every route; invoice detail shows raw MongoDB `_id` in crumbs.
3. **Destructive actions without confirm** — Invoice detail status changes (Mark PAID / Cancel) skip `AlertDialog` while list bulk and Agents delete use it.
4. **Shell / pattern drift** — Smart Report edit mode and Agent Fees loading state break `PageContainer` / `DetailContainer` chrome; Channel Performance skips `FiltersContainer`.
5. **Toast theme desync** — `sonner` reads `next-themes`; app theme uses custom `ThemeContext` (`zp-theme`).

### Overall assessment

The migration delivers a **coherent shadcn admin shell** with strong shared primitives (`PageContainer`, `FiltersContainer`, `DataTable`, `StatusBadge`, `useConfirmDialog`). Most list pages align. Gaps cluster around **a11y form wiring**, **confirm patterns on detail pages**, **breadcrumb duplication**, and **a few pages that bypass layout templates**.

---

## 2. Methodology

| Layer | Tools / skills | Coverage |
|-------|----------------|----------|
| Static | `baseline-ui`, `fixing-accessibility`, `shadcn` per-file review | 18 surface groups, ~45 primary TSX files |
| Runtime | Browser MCP snapshot + CDP (`localhost:5175`) | Login (session), Dashboard, Staff, Invoices, theme toggle light/dark |
| Flows | F1–F8 scripted against `sitemap-and-flows.md` | Static + partial runtime (F1, F2 surface verified on Staff) |
| Roles | `platform_admin` runtime; `branch_admin` static-only | Branch admin seed not re-logged in this session |
| Out of scope | AntD parity, animation perf, bundle size, backend rate limits | — |

**Skills loaded (ui-skills-root):** `baseline-ui`, `fixing-accessibility`, `shadcn`  
**Org guardrail read:** `coding-standard/frontend/backoffice/6-ui-and-styling.md`

---

## 3. Cross-cutting findings

| ID | Tag | Sev | Location | Rule | Issue | Suggested fix |
|----|-----|-----|----------|------|-------|---------------|
| CC-01 | a11y | **P0** | `layouts/AdminLayout.tsx:581-583` | fixing-accessibility: icon-only names | Mobile menu button has no `aria-label` | Add `aria-label="Open navigation menu"` |
| CC-02 | a11y | **P0** | `layouts/AdminLayout.tsx:639-648` | fixing-accessibility: icon-only names | Avatar trigger exposed as `"SP"` only in a11y tree | `aria-label="Account menu for {displayName}"` |
| CC-03 | consistency | **P0** | `AdminLayout.tsx:671-697` + all `PageContainer` pages | baseline-ui: hierarchy | Layout breadcrumb duplicates page title (`Home → Staff` + h1 "Staff Management") | Single owner: remove layout crumbs or page-level crumbs |
| CC-04 | shadcn | **P0** | `components/ui/sonner.tsx:1-6`, `contexts/ThemeContext.tsx` | shadcn / consistency | Toaster uses `useTheme()` from `next-themes`; app toggles `ThemeContext` | Pass `theme` from `ThemeContext` into `<Toaster theme={theme} />` |
| CC-05 | a11y | **P1** | `AdminLayout.tsx:676-694`, `PageContainer.tsx:42-64` | fixing-accessibility: list semantics | `<span className="contents">` wrappers inside `<ol>` breadcrumb lists | Render `BreadcrumbItem` + separator as direct `<li>` children |
| CC-06 | a11y | **P1** | `AdminLayout.tsx:194-221` | semantics | Nested sidebar: `SidebarMenuSubItem` inside `<div>` when `depth > 0` | Always use `SidebarMenuSub` as `<ul>` parent |
| CC-07 | consistency | **P1** | `AdminLayout.tsx:589-633` | responsive | Branch switcher + user context hidden on mobile (`hidden md:block`) | Show compact branch/user row on small screens |
| CC-08 | baseline-ui | **P2** | `App.tsx:31`, `Login.tsx:35,60` | layout: `h-dvh` not `h-screen` | Auth loading/login use `min-h-screen` | Replace with `min-h-dvh` |
| CC-09 | baseline-ui | **P2** | `components/data-table.tsx:162-163` | loading skeletons | Single `h-48` skeleton for entire table | Multi-row skeleton matching column count |
| CC-10 | shadcn | **P2** | Multiple pages | spacing: no `space-y-*` | `space-y-*` in InvoiceDetail, BulkProgressModal, SmartReport | Use `flex flex-col gap-*` |
| CC-11 | copy | **P3** | Various CTAs | ux-writing light | Mix of "Add New Staff" vs "Create" vocabulary | Align to "Create …" where creating records |

---

## 4. Consistency matrix

| Pattern | Staff | Agents | Invoices | Smart Report | Channel Perf. | Verdict |
|---------|-------|--------|----------|--------------|---------------|---------|
| Page shell (`PageContainer`) | Pass | Pass | Pass | **Partial** (edit ad-hoc) | Pass | Partial |
| Filter bar (`FiltersContainer`) | Pass | Pass | Pass | N/A (tabs) | **Fail** (custom card form) | Partial |
| Primary CTA in `extra` | Pass | Pass | Pass | Pass (list) | Pass | Pass |
| Data table (`DataTable`) | Pass | Pass | Pass | Pass | Pass (child) | Pass |
| Status badge vocabulary | Pass | Pass | Partial (`statusTagColor`) | — | — | Partial |
| Form overlay | Sheet | Dialog (sync) | Dialog (create) | — | — | Partial |
| Destructive confirm | AlertDialog | AlertDialog | Bulk yes / **detail no** | AlertDialog (delete) | — | Partial |
| Row actions | Icon + `aria-label` | Text buttons | Text "View Details" | — | — | Partial |
| Pagination sizes | 10/20/50 | 10/20/50 | **10 only** | — | — | Partial |
| Search debounce | 300ms | Immediate | Immediate | — | — | Partial |
| Breadcrumb | Layout + implicit | Layout + implicit | Layout + **raw id** on detail | Manual in edit | PageContainer items | Fail |

---

## 5. State coverage matrix

Legend: **P** Pass · **a** Partial · **M** Missing

| Surface | Loading | Empty | Empty (filtered) | Fetch error | Action error | Success | Partial bulk | In-flight submit | Permission | Stale/version |
|---------|---------|-------|------------------|-------------|--------------|---------|--------------|------------------|------------|---------------|
| Login | P | — | — | toast | toast | redirect | — | P (`LoadingButton`) | — | — |
| AdminLayout | P | — | — | silent (profile) | toast (branch) | toast | — | P (branch) | menu hide | — |
| Dashboard | P skeleton | a (no CTA) | — | toast only | — | — | — | — | hides stats | — |
| My Profile | P skeleton | — | — | inline text | toast+inline | toast | — | P | — | toast |
| Staff list | P (DataTable) | P (DataTable) | a generic msg | toast | toast+partial inline | toast | — | P drawer | gate create | If-Match toast |
| Invoices list | P | P | a generic | toast | toast | toast | **P** bulk modals | P | **M** create ungated | — |
| Invoice detail | a single skeleton | a custom card | — | toast | toast | toast | — | P | actions visible | If-Match |
| Agents | P | P | — | toast | inline branch | toast | — | **a** wrong loading flag | — | — |
| Agent Fees | **M** no shell | P | — | toast | toast only | toast | — | P | — | — |
| Smart Report | P | P | — | toast | toast | toast | — | P | — | 412 toast |
| Channel Perf. | P | P | — | toast | inline form | — | — | P | branch alert | — |
| Permission Admin | P | a weak empty | — | toast | toast | toast | — | P | 403 page | 412 toast |
| Error pages | — | — | — | — | — | — | — | — | P | — |
| Route error | — | — | — | **M** always 500 UI | — | — | — | — | — | — |

**Surfaces with ≥2 Missing/Partial states:** Dashboard, Invoices (list+detail), Agent Fees, Route error, Login (errors toast-only).

---

## 6. Task flow findings (F1–F8)

| Flow | Runtime | Friction points | Sev | Tag |
|------|---------|-----------------|-----|-----|
| **F1 Sign in** | Partial (existing session) | Validation/errors via toast only, not inline; no password show/hide | P1 | flow / a11y |
| **F2 Create staff** | Static + Staff page verified | Drawer errors on password not inline; `aria-invalid` missing on fields | P0–P1 | flow / a11y |
| **F3 Archive staff** | Static | Confirm dialog OK; success toast OK | Pass | flow |
| **F4 My Profile save** | Static | Load error lacks Retry; password API errors toast-only | P1 | flow / state |
| **F5 Bulk export** | Static | Export modal auto-starts — no explicit confirm | P2 | flow |
| **F6 Bulk status** | Static | Confirm + progress modal OK; partial fail list OK | Pass | flow |
| **F7 Smart report run** | Static | Editor breaks shell; query textarea unnamed | P1 | flow / consistency |
| **F8 Permission menu edit** | Static | Dialog missing `DialogDescription`; 412 handled via toast | P2 | flow |

---

## 7. Role UX notes

| Persona | Verified | Notes |
|---------|----------|-------|
| `platform_admin` | Runtime | Full menu, branch switcher, Permission Admin accessible; header shows initials "SP" when profile loads |
| `branch_admin` | Static only | Sidebar test covers Channel Performance nesting; branch alert on Channel Performance page |
| Low permission | Static | `Error403` + `PermissionGuard` redirect; inconsistency: some actions visible but API fails vs hidden |

**Findings**

| ID | Sev | Issue |
|----|-----|-------|
| R-01 | P1 | Invoice **Create** button not gated by write permission (Staff gates create correctly) |
| R-02 | P2 | Mobile header hides branch context — OU-wide roles lose switcher on small viewports |
| R-03 | P2 | `displayName ?? user.sub` fallback shows MongoDB id when staff profile fetch fails |

---

## 8. Visual craft notes (light / dark)

**Runtime:** Theme toggle works (`ThemeContext` adds/removes `dark` on `<html>`). Staff table, filters, and sidebar readable in both modes after toggle.

| Topic | Observation | Sev |
|-------|-------------|-----|
| Login vs interior | Login card uses `shadow-md`; inner pages mostly flat bordered cards — slight surface mismatch | P3 |
| Brand cohesion | Shared primary blue via CSS variables; Login `text-primary` title aligns with shell | Pass |
| Accent discipline | Smart Report info banner uses custom `border-info/30 bg-info/5` — extra accent | P3 |
| Typography | `PageContainer` uses `text-balance` / `text-pretty`; many pages inherit correctly | Pass |
| Tabular data | `DataTable` applies `tabular-nums` on right-aligned cells; Agent Fees matrix manual | Partial P2 |
| Dark mode toasts | Likely wrong theme class in Sonner (CC-04) — toasts may not match app dark | P0 |
| Invoice detail | Raw `text-green-600` for paid amounts — may clip contrast in dark | P2 |

---

## 9. Responsive & density notes

| Breakpoint | Observation | Sev |
|------------|-------------|-----|
| ~390px | Mobile nav flattens menu groups (static); hamburger lacks label (CC-01) | P1 |
| ~768px | Sidebar collapses via `SidebarTrigger`; filters wrap via `FiltersContainer` | Pass |
| ≥1280px | Channel Performance 28-column table uses horizontal scroll (static); sticky first col on Agent Fees uses `z-10` | P2 |
| Touch | Staff row icon buttons meet target; text row actions on Invoices/Agents smaller | P2 |

---

## 10. Per-surface report (summary)

### 1 — Login (`pages/Login.tsx`)

| Check | Result |
|-------|--------|
| baseline-ui | **Partial** — `min-h-screen`; errors toast-only |
| a11y | **Partial** — labels present; decorative icons not `aria-hidden`; no inline errors |
| shadcn | **Partial** — raw `Label`+`Input` vs `Field`/`FieldGroup` |
| States | Submit loading OK |

Key: **L-01 P1** toast-only login errors · **L-02 P2** `min-h-screen` · **L-03 P2** missing `Field` pattern · **L-04 P3** no password reveal toggle

---

### 2 — AdminLayout (`layouts/AdminLayout.tsx`)

Key: CC-01–CC-07; **AL-01 P1** mobile nav flattened vs desktop tree · **AL-02 P3** duplicate Billing/Invoice icons

---

### 3 — Dashboard (`pages/Dashboard.tsx`)

Key: **D-01 P2** empty widget without CTA button · **D-02 P2** non-admin sees only placeholder · **D-03 P3** em-dash stat without explanation

---

### 4 — My Profile (`pages/MyProfile.tsx`)

Key: **MP-01 P1** load error without Retry · **MP-02 P2** profile name not heading · **MP-03 P2** errors lack `aria-describedby` · Strongest `Field` usage overall

---

### 5–7 — Invoices (list, bulk modals, detail)

Key: **INV-01 P0** detail Mark PAID/Cancel without AlertDialog · **INV-02 P0** breadcrumb shows raw `_id` · **INV-03 P1** Create not permission-gated · **INV-04 P1** month validation toast-only · **INV-05 P2** no page size options · **INV-06 P2** search not debounced · Bulk progress: **INV-07 P1** needs `aria-live` on progress

---

### 8 — Agents (`pages/Agents/index.tsx`)

Key: **AG-01 P1** sync dialog uses table `loading` not sync state · **AG-02 P1** branch error raw `<p>` not `FieldError` · **AG-03 P2** Dialog vs Sheet inconsistency · **AG-04 P3** page title "Agent Fee Management" wrong for list

---

### 9 — Agent Fees (`pages/AgentFees/index.tsx`)

Key: **AF-01 P1** loading state drops `DetailContainer` · **AF-02 P1** unlabeled Reference Fees select · **AF-03 P2** toast-only matrix validation · **AF-04 P2** raw labels vs `Field`

---

### 10 — Staff (`pages/StaffManagement.tsx`, `StaffDrawer.tsx`)

Key: **ST-01 P0** `aria-invalid` missing on drawer inputs · **ST-02 P1** password mismatch toast-only · **ST-03 P2** tel validation stub · Shell/filter pattern **Pass**

---

### 11 — Smart Report (`pages/SmartReport.tsx`)

Key: **SR-01 P1** edit mode ad-hoc layout · **SR-02 P1** output format should be `ToggleGroup` · **SR-03 P1** query textarea without label · **SR-04 P2** raw `<table>` preview · List mode **Pass**

---

### 12 — Channel Performance (`ChannelPerformancePage.tsx`, `Royalty21SearchForm.tsx`)

Key: **CP-01 P1** not using `FiltersContainer` · **CP-02 P1** channel type manual buttons vs `ToggleGroup` · **CP-03 P1** form error not tied to fields · Breadcrumb via PageContainer **Pass**

---

### 13 — Permission Admin

Key: **PA-01 P1** revoke sessions checkbox label wiring · **PA-02 P2** menu empty lacks inline CTA · **PA-03 P2** `MenuNodeFormModal` missing `DialogDescription` · Tabs/shell **Pass**

---

### 14–15 — Error pages & RouteErrorPage

Key: **ERR-01 P0** `RouteErrorPage` always renders `Error500` · **ERR-02 P2** no "Reload" for chunk errors · **ERR-03 P3** `ResultTemplate` uses `min-h-[80vh]` not `dvh`

---

### 16 — Shared layout (`components/layout/*`)

**Pass** — `PageContainer`, `FiltersContainer`, `PageContentCard`, `DetailContainer` implement baseline typography. **Partial** — custom ReactNode titles bypass `h1`/`text-balance`.

---

### 17 — Shared data UI (`data-table.tsx`, filters, `status-badge.tsx`)

**Pass** — DataTable empty/loading/selection a11y. **Partial** — `status-badge` custom class overrides vs Badge variants; loading skeleton thin.

---

### 18 — Global feedback (`useAppFeedback`, `sonner`, `useConfirmDialog`)

Key: CC-04 sonner theme · **GF-01 P1** `AlertDialogDescription` with React nodes · **GF-02 P2** confirm OK lacks Spinner while pending · Archive/restore confirm pattern **Pass**

---

## 11. Prioritized backlog

### Wave 1 — P0 (blockers)

| Rank | ID | File(s) | Tag | Fix |
|------|-----|---------|-----|-----|
| 1 | ST-01 / CC | `StaffDrawer.tsx` | a11y | Add `aria-invalid` + `aria-describedby` on all fields |
| 2 | ERR-01 | `RouteErrorPage.tsx` | state | Map `isRouteErrorResponse` → 404 vs 500 |
| 3 | INV-01 | `InvoiceDetail.tsx` | shadcn | Wrap Mark PAID / Cancel in `useConfirmDialog` |
| 4 | CC-04 | `sonner.tsx`, `App.tsx` | shadcn | Wire Toaster to `ThemeContext` |
| 5 | CC-01, CC-02 | `AdminLayout.tsx` | a11y | `aria-label` on menu + account triggers |
| 6 | CC-03 / INV-02 | `AdminLayout.tsx`, invoice detail | consistency | Single breadcrumb owner; humanize invoice crumb |

### Wave 2 — P1 (UX / a11y high)

Staff/My Profile inline errors; Invoice create permission gate + inline month validation; Smart Report editor shell + field labels; Channel Performance `FiltersContainer` + ToggleGroup; Agents sync loading state; Agent Fees loading shell + labeled selects; bulk progress `aria-live`; mobile branch context.

### Wave 3 — P2 (consistency & craft)

Pagination/search parity on Invoices; Dialog vs Sheet standard; replace `space-y-*`; remove raw green/red Tailwind colors; DataTable multi-row skeleton; `min-h-dvh`; debounce invoice search.

### Wave 4 — P3 (polish)

Copy alignment (Create vs Add); icon `data-icon` sizing; dashboard empty CTA; template drift vs `live-demo-shadcn` optional pass.

---

## 12. Out of scope (this audit)

- Pixel parity with Ant Design `frontend/backoffice`
- Full `ui-ux-design.md` spec compliance
- `fixing-motion-performance` (animation jank, blur, scroll-linked motion)
- Bundle size / Lighthouse / Core Web Vitals
- Backend rate limits (noted as env noise only)
- Full Thai/i18n typography audit

---

## 13. Resolution log

| Wave | Scope | Status |
|------|-------|--------|
| 3 | P2 consistency & craft | Fixed |
| 4 | P3 polish and copy | Fixed |

---

## Appendix A — Template drift (Step 2H, optional)

| Area | Template (`live-demo-shadcn`) | Production | Drift |
|------|------------------------------|------------|-------|
| Layout exports | `templates/` demo views | `components/layout/` production copies | Low — intentional fork |
| Page composition | Demo mock data views | Real API pages | Expected |
| Filter fields | Shared demo components | Promoted to `components/` | Aligned |
| Login | Not in template demo router | Standalone page | N/A |

**Verdict:** Production correctly extends template primitives; drift is functional not visual.

---

## Appendix B — Browser verification log

| Route | h1 (runtime) | Toasts | Notes |
|-------|--------------|--------|-------|
| `/` | Dashboard | 0 | Stats visible for platform_admin |
| `/staff` | Staff Management | 0 | Row actions named; duplicate breadcrumb confirmed |
| `/invoices` | (loaded) | 0 | — |
| Theme toggle | — | 0 | `dark` class toggles on `<html>` |

**Not re-verified in browser this session:** `/login` (session active), `branch_admin` persona, F5–F8 full click-through, 390px viewport resize.

---

*Audit-only deliverable — no code changes in this commit.*
