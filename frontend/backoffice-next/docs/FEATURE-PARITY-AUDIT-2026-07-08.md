# Feature Parity Audit — backoffice vs backoffice-next

**Date:** 2026-07-08
**Scope:** All menus, page-level features, and backend API usage in [`frontend/backoffice`](../../backoffice) (legacy, frozen reference archive) vs [`frontend/backoffice-next`](../) (current, shipped to staging as v0.5.0)
**Design baseline:** [`studio-admin`](../../../coding-standard/frontend/backoffice/reference/studio-admin) — installed (`npm install`) as part of this audit so it's usable as a live reference for any future fix
**Method:** Two independent static-code inventories (one per app), cross-referenced, then 3 candidate discrepancies verified directly against source before being accepted or rejected
**Out of scope:** Visual/accessibility drift against the studio-admin design system — already covered by [`UI-UX-REVIEW-2026-07-07.md`](./UI-UX-REVIEW-2026-07-07.md) (57 findings, closed)

---

## 1. Executive summary

| Axis | Result |
|---|---|
| Menu / route parity | **100%** — every old route has a matching new route, none missing, none extra |
| Feature-function parity | **100%** — every feature found in the old app (search, export, sync, bulk actions, etc.) exists in the new app |
| Backend API parity | **100%** — every endpoint the old frontend calls, the new frontend calls too, through the same gateway prefixes |
| Confirmed real gaps | **0** |
| Candidate gaps investigated and ruled out | 3 (see §6 — static-inventory omissions, not code gaps) |
| Minor non-functional differences | 1 (see §7) |
| New-only enhancements (beyond old app) | Several — CSV export, column-visibility toggles, unsaved-changes guards (see §7) |

**Bottom line:** backoffice-next is a verified functional superset of backoffice. No code changes are required to reach parity. The only outstanding work in this app is the already-tracked visual/design-alignment backlog in `UI-UX-REVIEW-2026-07-07.md`, not missing functionality.

---

## 2. Methodology

1. Two separate research passes, one per app, each producing: a menu tree (item, route, guarding permission/role), a per-page feature list, and a consolidated backend-endpoint list (grepped from API client calls, not assumed from route names).
2. Cross-referenced both inventories line by line.
3. Anywhere the two inventories disagreed (old app description mentions a control the new app's description didn't), verified directly against source with `grep`/file reads rather than trusting the summary — this caught and ruled out 3 false positives (§6).
4. Backend endpoint lists were compared by gateway prefix (`/auth`, `/api/v1/staff`, `/api/v1/agent-invoice`, `/api/v1/invoices`, `/api/v1/smart-reports`, `/api/v1/branch-report`) rather than by frontend route, since both apps share the same backend services.

---

## 3. Role model

Both apps consume the same backend-owned role list (`backend/shared/platform-roles/index.js`), so there is nothing to migrate here — it's shared, not duplicated logic:

| Role | Branch scope | Present in old | Present in new |
|---|---|---|---|
| `platform_admin` | OU-wide (branch switcher) | ✓ | ✓ |
| `branch_admin` | Pinned to own branch | ✓ | ✓ |
| `support_admin` | OU-wide (branch switcher) | ✓ | ✓ |
| `support` | OU-wide (branch switcher) | ✓ | ✓ |
| `staff` | Pinned to own branch | ✓ | ✓ |

Both apps also replicate the `platform_admin` self-lockout guard on `permissions:manage` (can't revoke your own admin-permissions grant unless a wildcard already covers it).

---

## 4. Menu / route parity

| Menu item | Route | Old | New | Notes |
|---|---|:---:|:---:|---|
| Dashboard | `/` | ✓ | ✓ | |
| Staff → Staff Management | `/staff` | ✓ | ✓ | labeled "Profiles" in new sidebar, same route/feature |
| Billing → Agents | `/agents` | ✓ | ✓ | |
| Billing → Invoices | `/invoices` | ✓ | ✓ | |
| Reports → Smart Report | `/smart-reports` | ✓ | ✓ | |
| Branch Report → Channel Performance | `/branch-report/marketing/channel-performance` | ✓ | ✓ | |
| Settings → Permissions | `/permissions` | ✓ | ✓ | Menu Catalog + Role Permissions tabs, both apps |
| My Profile (sidebar-excluded, still routed) | `/profile` | ✓ | ✓ | |
| Agent Fees (detail, not in sidebar) | `/agents/:id/fees` | ✓ | ✓ | |
| Invoice Detail (detail, not in sidebar) | `/invoices/:id` | ✓ | ✓ | |
| Login | `/login` | ✓ | ✓ | |
| 403 | `/403` | ✓ | ✓ | |
| 404 | `/404` (explicit route) | ✓ | ✓ (Next.js `not-found.tsx` convention) | different mechanism, same coverage |
| 500 | `/500` | ✓ | ✓ | |

Both apps build the sidebar the same way: fetch the DB-backed menu catalog (`GET /auth/me/menus`) and intersect it with a hardcoded icon/route lookup table (`MENU_ENTRIES` in `AdminLayout.tsx`, same pattern in both). This dynamic-catalog architecture itself was ported, not just the visible menu items — the Menu Catalog admin UI (`/permissions` → Menu Catalog tab) that manages this DB registry is a verified 1:1 feature match (menu-node CRUD, protected-node lockout, role→menu mapping — see §5).

---

## 5. Feature-function parity by page

| Page | Old features | New features | Verdict |
|---|---|---|---|
| Dashboard | Stat cards (active/archived staff, static placeholder "new profiles"), 1 shortcut (Staff) | Stat cards (active/archived staff), 6 role-aware shortcuts (Staff, Invoices, Agents, Channel Performance, Smart Reports, Permissions/My Profile) | **Match**, new has more shortcuts |
| My Profile | Edit contact, change password (forces logout), refresh, ETag | Same | **Match** |
| Staff Management | Search, status filter, CRUD, archive/restore, admin reset-password, role reassignment, ETag | Same + CSV export, column visibility, view-mode toggle | **Match**, enhanced |
| Agents | Search, Sync Branch, Manage Fees, Delete | Same + CSV export, column visibility | **Match**, enhanced |
| Agent Fees | Default rate edit, Reference Fees inheritance, fee matrix (3-field cells), bulk diff save, hide-empty filter | Same + unsaved-changes guard | **Match**, enhanced |
| Invoices List | Search, branch/status/billing-month filters, row selection cap, Create Invoice, bulk bar (Mark PAID / Cancel / Export PDF / Export Excel), progress modal w/ retry-failed + cancel-in-progress | Same, verified incl. "Retry failed" (§6) + CSV export of visible rows | **Match**, enhanced |
| Invoice Detail | Metadata, line items + totals, Export PDF/Excel, Mark PAID, Cancel | Same | **Match** |
| Channel Performance | Branch-required/branch-changed alerts, 3-way Channel Type toggle (Affiliate Link / Member Referral / Direct), affiliate-link picker, date-range validation, Search/Clear | Same, verified incl. Channel Type toggle (§6) + CSV export | **Match**, enhanced |
| Smart Report | 2 tabs (Scripts / History), validate→test-run→save script gate, schedule config, run-on-demand, delete, download history, Reset to Example | Same, verified incl. Reset to Example (§6) + CSV export, column visibility, more granular schedule options (dayOfWeek/dayOfMonth) | **Match**, enhanced |
| Permissions (Menu Catalog + Role Permissions) | Menu-node CRUD, protected-node lockout, role→menu mapping, revoke-sessions-on-save, wildcard awareness | Same | **Match** |
| Login / 403 / 404 / 500 | Standard | Standard | **Match** |

---

## 6. Candidate gaps investigated — all ruled out

The two independent research passes disagreed on 3 points. Each was checked directly against source before being accepted or rejected as a real gap. All 3 turned out to exist in both apps — the discrepancy was an omission in one pass's summary, not a missing feature:

| Candidate gap | Verified location (both apps) | Result |
|---|---|---|
| Channel Type toggle (Affiliate Link / Member Referral / Direct) missing in new | `Royalty21SearchForm.tsx` — `CHANNEL_TYPE_OPTIONS` (3 options), `ToggleGroup` | **False positive** — present in both, identical options |
| "Retry failed" button missing from invoice bulk progress modal in new | `BulkProgressModal.tsx` — `onRetry` prop, "Retry failed" button rendered when `retryIds.length > 0` | **False positive** — present in both |
| "Reset to Example" button missing from Smart Report editor in new | `SmartReportEditor.tsx` | **False positive** — present in both |

---

## 7. Minor differences (not gaps)

- **Dashboard "New Profiles this week" stat card** — present in old with a static, non-functional placeholder value (`"—"`, never wired to real data); absent in new. Since it never displayed real data in the old app either, this is a cosmetic drop, not a functional loss.
- **New-only enhancements** (present in backoffice-next, not required for parity, noted for completeness): CSV export on Staff/Agents/Invoices/Channel Performance/Smart Reports list pages, column-visibility toggles on those same tables, unsaved-changes guard on Agent Fees (navigation + `beforeunload`), more granular Smart Report schedule options (`dayOfWeek`, `dayOfMonth`).

---

## 8. Backend API parity

Both apps call the same gateway-routed services, same endpoints, same methods — verified by grepping API client usage in both codebases, not by assuming from route names:

| Gateway prefix | Service | Endpoint parity |
|---|---|---|
| `/auth/*` | auth | Identical (login, refresh, logout, me/menus, me/password, me/active-branch, me/branch(es), admin/menus CRUD, admin/role-permissions) |
| `/api/v1/staff/*` | staff | Identical (profiles CRUD, archive, restore, password, role) |
| `/api/v1/agent-invoice/*` | agent-invoice | Identical (agents CRUD, sync, fees CRUD, master-data lookups) |
| `/api/v1/invoices/*` | agent-invoice | Identical (list, agent branches, detail, transactions, generate, status) |
| `/api/v1/smart-reports/*` | smart-report | Identical (CRUD, validate, test-run, run, history, download) |
| `/api/v1/branch-report/*` | branch-report | Identical (invite-links, royalty-21-times) |

No backend work is implied by this audit — the new frontend already consumes every endpoint the old one did.

---

## 9. Design-pattern note

No functional gaps were found, so no new UI needs to be built as a result of this audit. For any future work in this app — including closing any gap a later audit finds — the project convention stands: new UI must follow **studio-admin** patterns (`coding-standard/frontend/backoffice/reference/studio-admin`, now installed and runnable), not the old app's Ant-Design-influenced patterns (`PageContainer`/`FiltersContainer` wrappers, labeled filter rows). Known drift from studio-admin's visual patterns is already tracked separately in [`UI-UX-REVIEW-2026-07-07.md`](./UI-UX-REVIEW-2026-07-07.md).

---

## 10. Conclusion

backoffice-next has **complete, verified feature parity** with backoffice across menus, page-level functionality, and backend API usage. Recommend treating the migration as functionally done and directing any further effort at the design-alignment backlog rather than functional backfill.
