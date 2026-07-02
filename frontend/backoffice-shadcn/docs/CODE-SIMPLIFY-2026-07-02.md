# Code Simplify — Phase 1 (2026-07-02)

Incremental `/code-simplify` pass on production code (Waves 1–4). **Phase 1 only** — behavior preserved, no test files modified.

## Summary

| Sub-phase | Files | Change |
|-----------|-------|--------|
| 1a | `src/components/data-table.tsx` | Removed dead ternary on row model |
| 1b | `src/pages/StaffManagement.tsx`, `src/components/staff/StaffDrawer.tsx` | Tel stub comment, confirmPassword inline, `TITLES` record |
| 1c | `src/pages/Invoices/InvoiceDetail.tsx`, `src/pages/Agents/index.tsx` | `confirmInvoiceAction`, `refreshAgents`, `normalizeRefFeeBranchId` |
| 1d | `src/components/layout/site-header.tsx`, `src/components/filter-select.tsx` | `BreadcrumbItemContent`, single `ALL_OPTION` |

Phase 2 and Phase 3 completed in this session (see sections below).

---

## Phase 2 — Medium extractions

| # | File(s) | Change |
|---|---------|--------|
| 1 | `src/components/data-table.tsx`, `src/components/data-table.test.tsx` | `useMemo` for `selectableIds` shared by toggle-all + header; smoke tests for row/select-all |
| 2 | `src/pages/StaffManagement.tsx` | `withProfileEtag(record, action)` for archive/restore confirm flows |
| 3 | `src/pages/Invoices/invoiceTransactionColumns.tsx`, `InvoiceDetail.tsx` | Pure move of transaction `columns` |
| 4 | `src/components/auth/LoginCredentialField.tsx`, `src/lib/authErrors.ts`, `Login.tsx`, `MyProfile.tsx` | Shared credential field; auth errors in `authErrors.ts` (no overlap with `apiErrorMessage`) |
| 5 | `src/pages/profile/ProfileDetailsCard.tsx`, `ChangePasswordCard.tsx`, `MyProfile.tsx` | Split cards; early returns for loading/error |
| 6 | `src/layouts/AdminLayout.tsx` | `MENU_ENTRIES` consolidates icon + route; `sidebarProps` spreads `navUserProps` |
| 7 | `src/components/menu-tree.tsx`, `menu-tree.test.tsx` | `MenuTreeRowShell` + `MenuTreeRowProps`; smoke tests |
| 8 | `filter-select.tsx` | **Deferred** — `useSearchableSelectState` not warranted (~15 lines state) |

---

## Phase 3 — Deep refactor

| PR | File(s) | Change |
|----|---------|--------|
| 3a | `src/pages/SmartReportList.tsx`, `SmartReport.tsx` | List mode + history sheet extracted |
| 3b | `src/pages/SmartReportEditor.tsx`, `src/pages/smartReport/downloadHistoryColumns.tsx` | Editor mode extracted; deduped history columns |
| 3c | `src/pages/Invoices/hooks/useInvoiceListFilters.ts`, `index.tsx` | URL↔state hook; dual search model preserved |
| 3d | `src/components/staff/StaffFormField.tsx`, `StaffDrawer.tsx` | Field wrapper; `fieldA11y` ids preserved (`staff-*`) |

---

## Verification (Phase 2 + 3)

```bash
cd code-base/zero-platform/frontend/backoffice-shadcn
npm test -- --run          # 395/395 pass (66 files)
npm run lint               # 0 errors, 6 pre-existing warnings
npm run build              # pass
```

New tests: `data-table.test.tsx` (3), `menu-tree.test.tsx` (2). Suite grew from 390 → 395.

`docs/TEST-RUN-2026-07-02.md` intentionally **not** updated.

---

## Next steps (out of scope for this PR)

- None required from plan rev. 2 — all phases complete except deferred `useSearchableSelectState`.

## Phase 1a — data-table

**Before:** `isServerPagination ? table.getRowModel().rows : table.getRowModel().rows`  
**After:** `table.getRowModel().rows`

Both branches were identical; `isServerPagination` is still used for pagination mode elsewhere. `selectableIds` left unchanged (Phase 2).

---

## Phase 1b — Staff

### StaffManagement.tsx

- Removed no-op `telephoneRules` loop; left `// ST-03: tel validation deferred` (no wiring — separate bug-fix PR).
- Simplified `confirmPassword` validation to `if (v !== values.password) return 'Passwords do not match'`.
- Dropped unused `confirmPasswordRule` and `telephoneRules` imports.

### StaffDrawer.tsx

- Replaced nested ternary drawer title with `TITLES: Record<DrawerMode, string>` and `TITLES[mode]`.

---

## Phase 1c — Invoices detail + Agents

### InvoiceDetail.tsx

- Merged `promptUpdateStatus` / `promptCancelInvoice` shared confirm logic into `confirmInvoiceAction({ title, content, okText, onOk, danger? })` with guard `if (!invoice || !id) return`.

### Agents/index.tsx

- Added `normalizeRefFeeBranchId(refId)` for Mongo `$oid` vs string ref IDs in the Ref Fee Branch column.
- Added `refreshAgents()` (`useCallback`) deduplicating `fetchAgents({ page, limit: pageSize, search: searchText })` in `useEffect`, `handleSync`, and `handleDelete`.

---

## Phase 1d — Shell + filters

### site-header.tsx

- Extracted `BreadcrumbItemContent` for last/link/plain crumb rendering.
- `HeaderBreadcrumb` now takes `items` directly (custom trail only — CC-03).
- Simplified `hasCustomBreadcrumbTrail` to `(breadcrumb.items?.length ?? 0) > 0`.
- Removed unreachable parent/page fallback inside header breadcrumb (list pages own title via `PageContainer`).

### filter-select.tsx

- Introduced `ALL_OPTION` constant used for both `items` prop and `SelectItem` list (single definition, mapped via `items.map`).

---

## Verification

```bash
cd code-base/zero-platform/frontend/backoffice-shadcn
npm test -- --run          # 390/390 pass (64 files)
npm run lint               # 0 errors, 6 pre-existing warnings
npm run build              # pass
```

Targeted tests run during implementation:

- `site-header.test.tsx`, `StaffManagement.test.tsx`, `StaffDrawer.test.tsx`
- `InvoiceDetail.test.tsx`, `Agents/index.test.tsx`

`docs/TEST-RUN-2026-07-02.md` intentionally **not** updated (coverage unchanged).

---
