---
status: completed
created: 2026-07-12
updated: 2026-07-12
services: [backoffice-next]
source-review: /test + /review five-axis on fix/fe-ux-shadcn-ds-2026-07-10
branch: fix/fe-ux-shadcn-ds-2026-07-10
parent-plan: docs/exec-plans/completed/fe-ux-shadcn-ds-2026-07-10.md
---

# Review: FE branch retrospective — backoffice-next (`fix/fe-ux-shadcn-ds-2026-07-10`)

## Objective

Retrospective `/test` + five-axis `/review` of **`frontend/backoffice-next` only** (136 files vs `origin/main`). Report-only — findings become tech-debt rows / follow-up work, not blocking edits to already-committed code.

**Out of scope:** backend services, legacy `frontend/backoffice/live-demo` deletion, repo-level `docs/specs`.

## Progress log

- 2026-07-12: Phase 1 gates run (`check`, `test`, `build`)
- 2026-07-12: Manual coverage-gap scan + grouped five-axis review (A–E)
- 2026-07-12: Verdict **Request changes** — 1 Critical (build), 11 Important, 12 Suggestions
- 2026-07-12: **All findings fixed inline** — Critical, all 11 Important, all 12 Suggestions resolved (see Resolution below). Proposed TD-027–030 no longer needed.

## Resolution (2026-07-12)

All findings from this review were fixed in the same branch rather than deferred to tech debt.

| Gate | Before | After |
|------|--------|-------|
| `npm run lint` (CI gate) | FAIL (5 errors) | **PASS** (0 errors, warnings only) |
| `npm run check` | FAIL (64 errors) | **PASS** (0 errors) |
| `npm test` | 547/547 | **547/547** |
| `npm run build` | FAIL (Link typing) | **PASS** |

Notes:

- **FE-BR-001** fixed by making `children?: ReactNode` on `Link` (`compat.tsx`).
- Two **additional build-blocking type errors** were masked behind FE-BR-001 in the branch-new `src/lib/staffProfileForm.ts` (`normalizeContact*` and `validateStaffProfileField` receiving `string | null | undefined`). Both fixed — contact helpers widened to accept `null`, `validateStaffProfileField` coerces `values[field]` to `string | undefined`.
- **FE-BR-011** cleared via `biome check --write` across `src` (48 files auto-formatted / import-sorted). The 5 residual `nursery/useNullishCoalescing` errors are intentional falsy-fallback `||` (boolean OR + empty-string label fallbacks); converting to `??` would be a behavior bug, so they carry targeted `biome-ignore` suppressions with rationale.
- Suggestions applied as code changes except **FE-BR-S10** (Query Script visible label): the card title "Query Script" already serves as the visible label and the textarea keeps its `aria-label`; no duplicate label added.

## Phase 1 — Verification results

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| Lint/format | `npm run check` | **FAIL** | 64 errors, 81 warnings, 6 infos (Biome across 321 files) |
| Unit tests | `npm test` | **PASS** | 547/547 (85 files) |
| Production build | `npm run build` | **FAIL** | TypeScript: `Link` `children` required in `render` prop pattern |

### Build failure (Critical)

```
./src/components/layout/AppBrand.tsx:11:37
Type error: Property 'children' is missing in type '{ to: string; }' but required in type Link props
```

Same pattern in [`NavMain.tsx`](../../../frontend/backoffice-next/src/components/layout/NavMain.tsx) lines 131, 154. Root cause: [`navigation/compat.tsx`](../../../frontend/backoffice-next/src/navigation/compat.tsx) declares `children: ReactNode` as **required**, but Base UI `render={<Link .../>}` injects children at runtime — TypeScript cannot see this. **Blocks CI** (`npm run build` in GHA / `ci-all.sh`).

### Biome check (Important for CI hygiene)

`npm run check` fails repo-wide. New-in-this-diff instances include unsorted imports (`SmartReportEditor.tsx`, `useSmartReportEditor.ts`, `RolePermissionsTab.tsx`, `InvoiceDetail.tsx`) and formatting drift (`AgentsList.test.tsx`, `agents-columns.tsx`). Pre-existing debt also contributes to the 64-error total.

## Coverage gaps (manual scan)

| Area | Behavior | Test status |
|------|----------|-------------|
| Smart Report editor | `handleValidateScript` empty/fail, `handleCancelTestRun`, dirty-leave confirm→navigate | Partial — `useSmartReportEditor.test.ts` covers happy paths only |
| Smart Report list | `loadDrawerHistory` staleness (no AbortController) | **No test** |
| `downloadHistoryColumns.tsx` | drawer variant, `StatusCell`, icon download, compact date | **No dedicated test file** |
| `smartReportScriptGate.ts` | Gate state machine | **Well covered** (36 tests) |
| Invoice `amountDue` fallback | `invoice.amount == null → totals.totalAmount` | **Untested** in Detail/PDF/XLSX |
| Invoice overdue badge | `isDueDateOverdue` true-case (destructive styling) | **Untested** (fixture due dates always future) |
| Invoice Detail export | Export dropdown menu → PDF/Excel handlers | **Untested** |
| `buildInvoicePdf` / `buildInvoiceXlsx` | Cell content (amount, currency, billing month) | Magic-bytes only — no content assertions |
| `BulkInvoiceActionBar` | mobile (`left-1/2`) and collapsed-sidebar offsets | Desktop expanded only |
| `permissionAdminUtils` | `ROLE_LABELS` / `ROLE_FILTER_OPTIONS` exports | Indirect coverage only |
| `MenuNodeFormModal` | `SelectGroup` wrapping | **No test file** |
| `NavMain` | `isRouteActive` prefix match (`/agents/123` → `/agents` active) | **Untested** |
| `NavMain` | Collapsed-sidebar `NavDropdownItem` keyboard Enter | **Untested** (reproduced dead-end) |
| `ChannelPerformancePage` | Export toolbar before first search | **Untested** (regression) |

## Phase 2 — Five-axis findings

### Critical

#### FE-BR-001 — `npm run build` fails on `Link` render-prop typing

| | |
|--|--|
| **Axis** | Correctness |
| **Files** | [`AppBrand.tsx`](../../../frontend/backoffice-next/src/components/layout/AppBrand.tsx):11, [`NavMain.tsx`](../../../frontend/backoffice-next/src/components/layout/NavMain.tsx):131,154, [`navigation/compat.tsx`](../../../frontend/backoffice-next/src/navigation/compat.tsx):306-315 |
| **Problem** | Base UI `render={<Link to={...} />}` pattern omits `children` in JSX; `Link` type requires `children: ReactNode`. `next build` fails. |
| **Fix** | Make `children` optional on `Link` props (`children?: ReactNode`) in `compat.tsx`. |
| **Proposed TD** | TD-027 |

### Important

#### FE-BR-002 — Download-history drawer stale-response race

| | |
|--|--|
| **Axis** | Correctness |
| **Files** | [`SmartReport.tsx`](../../../frontend/backoffice-next/src/views/SmartReport.tsx):140-155, 188-194 |
| **Problem** | `loadDrawerHistory` has no `AbortController` / reportId guard. Rapid "View files" clicks on different reports can show wrong history. `fetchReports` in the same file correctly aborts. |
| **Fix** | Pass `AbortSignal` or check `reportId` before `setDrawerDownloads`. |
| **Proposed TD** | TD-028 |

#### FE-BR-003 — Duplicated / divergent "amount due" calculation

| | |
|--|--|
| **Axis** | Correctness + Architecture |
| **Files** | [`InvoiceDetail.tsx`](../../../frontend/backoffice-next/src/views/invoices/InvoiceDetail.tsx):196-206, [`buildInvoicePdf.ts`](../../../frontend/backoffice-next/src/views/invoices/export/buildInvoicePdf.ts), [`buildInvoiceXlsx.ts`](../../../frontend/backoffice-next/src/views/invoices/export/buildInvoiceXlsx.ts) |
| **Problem** | Headline uses `invoice.amount ?? totals.totalAmount`; footer/totals row renders raw transaction sum independently. Three copies of fallback logic; numbers can disagree on same document. |
| **Fix** | Extract `resolveInvoiceAmountDue(invoice, transactions)` in `utils.ts`; reuse everywhere. |
| **Proposed TD** | TD-029 |

#### FE-BR-004 — Timezone-naive overdue badge

| | |
|--|--|
| **Axis** | Correctness |
| **Files** | [`utils.ts`](../../../frontend/backoffice-next/src/views/invoices/utils.ts):66-74 (`isDueDateOverdue`) |
| **Problem** | UTC-parsed `due_date` + local `setHours(0,0,0,0)` can flip "Overdue" a day early in negative UTC-offset zones. |
| **Fix** | Compare UTC calendar dates or truncate ISO date string. |

#### FE-BR-005 — Collapsed-sidebar dropdown keyboard dead-end

| | |
|--|--|
| **Axis** | Correctness + Accessibility |
| **Files** | [`NavMain.tsx`](../../../frontend/backoffice-next/src/components/layout/NavMain.tsx):60-69 (`NavDropdownItem`) |
| **Problem** | `<Link>` nested inside `<DropdownMenuItem>` — Enter on focused `menuitem` fires zero navigations. Mouse works. |
| **Fix** | Use `render={<Link .../>}` on `DropdownMenuItem` (same pattern as `SidebarMenuSubButton`). |
| **Proposed TD** | TD-030 |

#### FE-BR-006 — PermissionAdmin tab/tabpanel ARIA regression

| | |
|--|--|
| **Axis** | Accessibility |
| **Files** | [`PermissionAdmin.tsx`](../../../frontend/backoffice-next/src/views/permission-admin/PermissionAdmin.tsx):92-120 |
| **Problem** | Plain `<div hidden>` panels lost `role="tabpanel"` / `aria-controls` / `aria-labelledby` from Base UI `TabsContent`. |
| **Fix** | Add manual ARIA attributes linking panels to triggers. |

#### FE-BR-007 — Wildcard-mapping banner removed silently

| | |
|--|--|
| **Axis** | Correctness + UX |
| **Files** | [`RolePermissionsTab.tsx`](../../../frontend/backoffice-next/src/views/permission-admin/RolePermissionsTab.tsx) |
| **Problem** | "Loaded mapping includes wildcards" `Alert` deleted with its test; `wildcards` state still gates checkboxes for non-`platform_admin` roles with zero UI feedback. |
| **Fix** | Restore lightweight notice or document intentional removal. |

#### FE-BR-008 — Channel Performance export before search

| | |
|--|--|
| **Axis** | Correctness + UX |
| **Files** | [`ChannelPerformancePage.tsx`](../../../frontend/backoffice-next/src/views/branch-report/marketing/ChannelPerformancePage.tsx):197-206 |
| **Problem** | Export toolbar no longer gated by `hasSearched`; pre-search click downloads header-only CSV. |
| **Fix** | Restore gate or disable Export when row count is 0. |

#### FE-BR-009 — Smart Report editor mobile column order regression

| | |
|--|--|
| **Axis** | Correctness + UX |
| **Files** | [`SmartReportEditor.tsx`](../../../frontend/backoffice-next/src/views/SmartReportEditor.tsx):226, 228, 304 |
| **Problem** | `lg:order-*` reorders columns on desktop but below `lg` DOM order shows Query Script before Report Name. |
| **Fix** | Add base `order-1`/`order-2` for mobile or test intended order. |

#### FE-BR-010 — Unused `mode` prop on SmartReportEditor

| | |
|--|--|
| **Axis** | Readability / Architecture |
| **Files** | [`SmartReportEditor.tsx`](../../../frontend/backoffice-next/src/views/SmartReportEditor.tsx):73, 106 |
| **Problem** | `mode` declared in props, never used in render body — incomplete refactor artifact. |
| **Fix** | Wire into copy/behavior or remove from public API. |

#### FE-BR-011 — `npm run check` fails (new Biome errors in diff)

| | |
|--|--|
| **Axis** | CI hygiene |
| **Files** | `RolePermissionsTab.tsx`, `AgentsList.test.tsx`, `agents-columns.tsx`, `SmartReportEditor.tsx`, `useSmartReportEditor.ts`, `InvoiceDetail.tsx` |
| **Problem** | Unsorted imports and formatting errors introduced by this branch (confirmed vs `origin/main`). |
| **Fix** | `biome check --write` on touched files. |

#### FE-BR-012 — Dead import in InvoiceList.test.tsx

| | |
|--|--|
| **Axis** | Readability |
| **Files** | [`InvoiceList.test.tsx`](../../../frontend/backoffice-next/src/views/invoices/InvoiceList.test.tsx):2 |
| **Problem** | `userEvent` imported but unused after href-assertion refactor. Biome `noUnusedImports`. |
| **Fix** | Remove import. |

### Suggestions

| ID | File | Summary |
|----|------|---------|
| FE-BR-S01 | `useSmartReportEditor.ts:434,461-462` | Dead exports: `scriptGateStep`, `applyLoadedReport`, `initializeCreate` in public API |
| FE-BR-S02 | `formatters.ts:131-134` | `formatLastRunDisplay` exported + tested but unused; `SmartReport.tsx` duplicates inline |
| FE-BR-S03 | `SmartReport.test.tsx` | `act()` warnings from unawaited debounce/fetch — wrap in `waitFor` |
| FE-BR-S04 | `BulkInvoiceActionBar.tsx:43-47` | Nested ternary for offset class — extract lookup |
| FE-BR-S05 | `InvoiceDetail.tsx:251`, `invoice-columns.tsx:75` | `ariaLabel` uses raw enum (`READY`) not friendly label |
| FE-BR-S06 | `invoice-columns.tsx:106-113` | Tooltip moved from accessible component to native `title` |
| FE-BR-S07 | `MenuNodeFormModal.tsx:15-24` | `SelectGroup` without `SelectLabel` |
| FE-BR-S08 | `DetailContainer.tsx:111`, `ChannelPerformancePage.tsx:189` | New nested ternaries — prefer if-chain |
| FE-BR-S09 | `SmartReport.tsx:29` | `REPORT_HISTORY_ENRICHMENT_LIMIT=100` — stale lastRun for reports beyond limit (pre-existing) |
| FE-BR-S10 | `SmartReportEditor.tsx:257-266` | Query Script textarea lost visible `FieldLabel` |
| FE-BR-S11 | `utils.ts:9-27` | `formatMoneyWithCurrency` uses `en-US` grouping regardless of currency code |
| FE-BR-S12 | `coding-standard/.../01-tech-stack.md` | Says legacy `frontend/backoffice` "removed" — directory still exists (deprecated) |

## What's done well

- Script-gate state machine (`smartReportScriptGate.ts`) left functionally untouched during UI migration — 36 unit tests cover edge cases.
- Smart Report list `fetchReports` / `fetchEnrichmentHistory` use `AbortController` correctly.
- Invoice back-navigation: URL-encoded `?return=` replaces fragile router `state` — survives refresh/deep links, well-tested.
- `useAgentFees` loading split (`fetching` / `masterDataLoading` / `saving`) — avoids save spinner disabling controls during background fetches.
- `NavMain` move to real `<Link>` elements — correct direction for cmd-click, right-click, crawlability (blocked only by typing bug).
- `AgentsList` `showInactive` now correctly flows to `fetchAgents({ includeInactive })` — real behavior fix, not just UI.
- Group E docs sync (`c8903e7`) — spot-checked claims accurate against current code.
- Test harness fixes (TD-026): `InvoiceList` SidebarProvider, `AdminLayout` Dashboard link query — 547/547 green.

## Proposed tech-debt rows — RESOLVED INLINE (not opened)

The following were proposed for deferral but instead **fixed in-branch**, so no TD rows were opened:

| ID | Priority | Description | Status |
|----|----------|-------------|--------|
| TD-027 | P1 | `npm run build` fails — `Link` `children` required breaks Base UI `render` prop | ✅ Fixed (FE-BR-001) |
| TD-028 | P2 | Smart Report download-history drawer stale-response race | ✅ Fixed (FE-BR-002) |
| TD-029 | P2 | Invoice `amountDue` duplicated in Detail + PDF + XLSX | ✅ Fixed (FE-BR-003) |
| TD-030 | P2 | `NavDropdownItem` keyboard Enter dead-end in collapsed sidebar | ✅ Fixed (FE-BR-005) |

## Verdict

**Approved** — all findings resolved inline; gates green (`lint`, `check`, `test`, `build`).

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | ✅ Fixed |
| Important | 11 | ✅ Fixed |
| Suggestion | 12 | ✅ Fixed (S10 addressed by existing card-title label) |

**Top 3 structural issues:**

1. **Build-breaking `Link` typing** — one-line fix in `compat.tsx` unblocks CI and the entire real-link navigation migration.
2. **Duplicated invoice amount-due logic** — three copies that can silently disagree on the same document.
3. **Accessibility regressions** — tab/tabpanel ARIA in permissions, keyboard dead-end in collapsed nav dropdown.

**Recommended next steps:**

1. Fix TD-027 (`children?: ReactNode` on `Link`) — unblocks `npm run build`.
2. Run `biome check --write` on touched files — unblocks `npm run check` for new errors.
3. Open follow-up exec plan for TD-028–030 + coverage gaps if not fixing inline before merge.

## Related

- Completed UX plan: [`fe-ux-shadcn-ds-2026-07-10.md`](./fe-ux-shadcn-ds-2026-07-10.md)
- Tech debt tracker: [`tech-debt-tracker.md`](../tech-debt-tracker.md)
- Coding standards: [`coding-standard/frontend/backoffice/`](../../../coding-standard/frontend/backoffice/)
