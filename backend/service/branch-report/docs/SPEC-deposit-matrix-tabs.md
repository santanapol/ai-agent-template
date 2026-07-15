# Spec: Deposit Matrix Tabs (Channel Performance)

> Phase: **SPECIFY** ✓ (approved 2026-07-14) · **PLAN** ✓ · **TASKS** ✓ · **IMPLEMENT** ✓  
> Date: 2026-07-14 · **Amended 2026-07-14** — review fixes (shadcn Tabs, AC-M8, % rounding, errors, batch)  
> Parent: [SPEC-royalty-21-times-mission.md](./SPEC-royalty-21-times-mission.md) (Royalty 21 Times) · [docs/royalty-21-times.md](./royalty-21-times.md)  
> Sample reference: [docs/sample/signal-2026-07-03-10-45-00-702.png](./sample/signal-2026-07-03-10-45-00-702.png)  
> Plan: [../../../../docs/exec-plans/completed/deposit-matrix-ship-fixup-2026-07.md](../../../../docs/exec-plans/completed/deposit-matrix-ship-fixup-2026-07.md)

---

## Assumptions

1. **Page:** Same Channel Performance page as Royalty 21 — add **shadcn/ui `Tabs`** (`@/components/ui/tabs`, same pattern as PermissionAdmin); do **not** add a new route; do **not** introduce Ant Design Tabs. **Confirmed** (amended 2026-07-14).
2. **Shared Search:** One search form; filters apply to all three tabs (`channelType`, `regDateFrom`/`regDateTo`, `inviteLinkId`, `referralUsername` when Member Referral). **Confirmed.**
3. **Member set:** Matrix rows are derived from the **same member population** as Tab 1 after Search (not a separate cohort). Pagination on Tab 1 does **not** subset the matrix — matrix aggregates **all** matching members. **Confirmed.**
4. **Cell meaning (count):** For deposit round `N` (1–21) and amount bucket `B`, count = number of members whose **Nth successful lifetime deposit** `amt` falls in `B`. Members with **no** Nth deposit (missing slot) are **not** counted in any bucket for column `N`. Do **not** treat padded `0` as a real deposit. Explicit `amt === 0` **does** count in `0 - 99`. **Confirmed.**
5. **Amount buckets** (inclusive bounds; currency units same as `amt`):

| Rank label      | Condition             |
| --------------- | --------------------- |
| `0 - 99`        | `0 <= amt <= 99`      |
| `100 - 199`     | `100 <= amt <= 199`   |
| `200 - 299`     | `200 <= amt <= 299`   |
| `300 - 499`     | `300 <= amt <= 499`   |
| `500 - 999`     | `500 <= amt <= 999`   |
| `1,000 - 2,999` | `1000 <= amt <= 2999` |
| `3,000 - 4,999` | `3000 <= amt <= 4999` |
| `5,000 - 9,999` | `5000 <= amt <= 9999` |
| `10,000 +`      | `amt >= 10000`        |

Amounts `amt < 0` are **excluded**. **Confirmed 2026-07-14** (bucket renamed from sample `1 - 99`). 6. **Columns:** Deposit rounds **1–21** + trailing **SUM** (row total of counts across rounds 1–21). Sample spreadsheet used 1–20; product uses **21**. **Confirmed.** 7. **% matrix:** Each data cell = column share  
`count[bucket][N] / sum(count[*][N]) * 100`  
when column total > 0; else `0`.  
**Rounding:** round **each** percent value independently to **2 decimal places** (half-up); **do not** rebalance so a column sums to exactly 100.00. Display as `xx.xx%`.  
**SUM** column on % tab = `rowSum / grandTotal * 100` (same rounding rule). **Confirmed** (amended 2026-07-14). 8. **Fetch:** No matrix load on mount. On Search, fetch **member list and matrix in parallel** (eager). Search button stays loading until **both** settle. Clear / branch switch resets both. **Confirmed 2026-07-14.** 9. **Partial failure:** Member list and matrix errors are **independent**. If list succeeds and matrix fails → Tab 1 shows data; Tabs 2–3 show empty matrix + toast `Failed to load deposit matrix`. If matrix succeeds and list fails → existing list error path; matrix may still render. Abort (Clear / unmount) does not toast. **Confirmed 2026-07-14.** 10. **API:** `GET /api/v1/branch-report/royalty-21-times/deposit-matrix` — one response with counts + percents (server-side). Query filters match list report **without** `page` / `pageSize`. **Confirmed 2026-07-14.** 11. **Batch size:** ~~Repository loads matching `mem_id`s then aggregates deposit slots in batches of `500` (`DEPOSIT_MATRIX_MEM_BATCH`). No soft max member cap in V1 (ask first if needed later).~~ Superseded — see decision 8 in the "Review amendments" section below (single aggregation pipeline, no batching, no cap needed). **Confirmed 2026-07-14; superseded 2026-07-14.** 12. **Permission:** Reuse existing `branch-report:marketing:channel-performance:read` — no new permission. **Confirmed 2026-07-14.** 13. **UI language / theme:** English tab labels `Member detail` / `Deposit count` / `Deposit %`; match existing Channel Performance styling (no Excel orange/pink header clone; no sample cell highlights). **Confirmed 2026-07-14.**

---

## Objective

### What we build

On **Channel Performance** (Royalty 21 Times), add two tabs that show a **deposit amount × deposit-round matrix** for the same Search filters as the member table:

| Tab | Label         | Content                        |
| --- | ------------- | ------------------------------ |
| 1   | Member detail | Existing per-member Royalty 21 |
| 2   | Deposit count | Integer matrix + SUM column    |
| 3   | Deposit %     | Percentage matrix + SUM column |

### Target users

Same as Royalty 21 — backoffice / marketing ops for the active navbar branch.

### User stories

| ID    | As a…           | I want to…                           | So that…                                              |
| ----- | --------------- | ------------------------------------ | ----------------------------------------------------- |
| US-M1 | backoffice user | open Deposit count after Search      | I see how many members fall in each amount×round cell |
| US-M2 | backoffice user | open Deposit % after the same Search | I see column distribution (and SUM share) as %        |
| US-M3 | backoffice user | keep one Search for all tabs         | I do not re-enter filters when switching views        |

### Acceptance criteria

- [ ] **AC-M1** Page uses shadcn `Tabs`: Member detail · Deposit count · Deposit %. Search form sits **above** tabs and is shared.
- [ ] **AC-M2** Matrix has fixed row labels = amount buckets (assumption 5); columns = `1`…`21` + `SUM`.
- [ ] **AC-M3** Deposit count shows integers; Deposit % shows `xx.xx%` per assumption 7 rounding; SUM columns match assumptions 6–7.
- [ ] **AC-M4** Matrix uses the same query params and tenant scope as `GET …/royalty-21-times` (including Member Referral exact username when present); no `page`/`pageSize`.
- [ ] **AC-M5** Matrix aggregates **all** matching members (not the current page of Tab 1), computed via a single MongoDB aggregation pipeline (no batching, no per-request member-count cap — amended 2026-07-14, see decision 8 below).
- [ ] **AC-M6** No matrix fetch until Search; Clear / branch change resets matrix state; Search loading waits for both requests.
- [ ] **AC-M7** API envelope + validation errors match existing branch-report conventions.
- [ ] **AC-M8** Unit tests cover bucket assignment, **missing slot skipped** (vs real `amt === 0`), % and SUM math / rounding; repository/service tests cover filter reuse.
- [ ] **AC-M9** Partial failure: matrix error does not wipe a successful member table (and vice versa); aborted requests do not toast.
- [ ] **AC-M10** No new permission key; same route gate as Channel Performance today.

### Out of scope

- Excel / CSV export of the matrix
- Cell color highlights from the sample sheet
- Changing Tab 1 columns or Royalty member metrics
- Filtering deposits by calendar month (still lifetime deposit order #1–21)
- Soft max / reject on oversized cohorts — not needed after the 2026-07-14 pipeline-rewrite amendment (see decision 8): cost scales with one DB-side aggregation, not per-request round-trips
- Channel Summary / other marketing reports
- Ant Design Tabs/Table for this page

---

## Tech Stack

| Layer    | Choice                                                                  |
| -------- | ----------------------------------------------------------------------- |
| Backend  | Same as Royalty 21 — Fastify + MongoDB (`branch-report`)                |
| Frontend | `backoffice-next` — React + **shadcn/ui** (`Tabs`, existing table/card) |

---

## Commands

```bash
# Backend
cd backend/service/branch-report && npm test
cd backend/service/branch-report && npm run ci

# Frontend (Channel Performance)
cd frontend/backoffice-next && npm test -- --run src/views/branch-report
cd frontend/backoffice-next && npm run ci
```

---

## Project Structure

```
backend/service/branch-report/
  src/modules/royalty-21-times/          → extend with deposit-matrix route
  src/lib/deposit-matrix.js              → bucket + matrix math (+ tests)
  docs/royalty-21-times.md               → amend matrix section
  docs/design/royalty-21-times-ui.md     → amend Tabs wireframe (shadcn)
  docs/SPEC-deposit-matrix-tabs.md

frontend/backoffice-next/src/
  views/branch-report/marketing/
    ChannelPerformancePage.tsx           → Tabs shell + shared Search + parallel fetch
  components/branch-report/marketing/
    DepositMatrixTable.tsx (new)         → count / % modes (alongside Royalty21Table)
```

---

## Code Style

Follow existing Royalty module patterns: factory `createXRepository/Service/Controller`, JSON Schema on routes, pure helpers for buckets/% in `src/lib`.

```javascript
export const AMOUNT_BUCKETS = [
  { key: "0-99", label: "0 - 99", min: 0, max: 99 },
  // ...
  { key: "10000+", label: "10,000 +", min: 10000, max: Infinity },
];

export function amountBucketKey(amt) {
  const n = Number(amt);
  if (!Number.isFinite(n) || n < 0) return null;
  return AMOUNT_BUCKETS.find((b) => n >= b.min && n <= b.max)?.key ?? null;
}
```

Frontend: English tab labels; `tabular-nums` for matrix cells; horizontal scroll for 21 + SUM columns.

---

## Testing Strategy

| Level        | Where                            | Covers                                                      |
| ------------ | -------------------------------- | ----------------------------------------------------------- |
| Unit         | `src/lib/deposit-matrix.test.js` | Bucket edges, missing slot vs 0, % / SUM, 2-dp rounding     |
| Service/repo | `royalty-21-times*.test.js`      | Same filters as member report; batching; matrix shape       |
| FE unit      | vitest near page/components      | Tabs; parallel Search; partial failure; Clear resets matrix |

Coverage target: new pure math at 100% of branches; route happy-path + 400 validation.

---

## Boundaries

- **Always:** Reuse Royalty 21 member filter + deposit success rules (`DEPOSIT_SUCCESS_STATUS`, sort `bill_date` ASC, slots 1–21); never pad before bucketing; document bucket edges in `docs/royalty-21-times.md`; keep tenant `{ ou_id, branch_id }`; use shadcn Tabs.
- **Ask first:** Changing bucket ranges; exporting; moving matrix to a separate route; counting deposits differently than “Nth deposit per member”; adding a soft max cohort size; introducing Ant Design on this page.
- **Never:** Client-only matrix from current page rows; dropping shared Search; hardcoding branch/ou; treating padded zeros as deposits; cloning Excel decorative colors as a requirement.

---

## Success Criteria

1. After Search, Tab 2 shows a 9×(21+SUM) integer grid; Tab 3 shows the matching % grid.
2. Switching tabs does not require a new Search for the same criteria.
3. Totals: each count row’s SUM = sum of cols 1–21; each count column total feeds % denominators; % cells rounded per assumption 7 (column need not sum to 100.00).
4. Member Referral + Affiliate + Direct filters behave like Tab 1.
5. Partial failure and permission ACs met; specs/docs updated; tests green under Commands above.

---

## Open Questions

Resolved 2026-07-14:

1. **Tab labels:** `Member detail` / `Deposit count` / `Deposit %` — confirmed.
2. **API path:** `GET /api/v1/branch-report/royalty-21-times/deposit-matrix` — confirmed.
3. **Fetch:** Eager on Search (with member list) — confirmed.
4. **Buckets:** First row `0 - 99` (`0 <= amt <= 99`); `amt < 0` excluded — confirmed.

Review amendments 2026-07-14 (no further questions):

5. **UI kit:** shadcn Tabs (not antd).
6. **% rounding:** 2 dp half-up per cell; no rebalance.
7. **Partial failure:** independent list vs matrix errors.
8. ~~**Batch:** 500 mem ids per deposit aggregation chunk.~~ Superseded 2026-07-14 (post-`/ship` review, security-auditor High finding: unbounded-cohort DoS risk under the batch-loop design): `findDepositMatrix` rewritten as a single MongoDB aggregation pipeline (`member` → `$lookup` deposits, top-21 by `bill_date` → `$unwind` for round → `$switch` bucket generated from `AMOUNT_BUCKETS` → `$group`). No Node-side batch loop, no `DEPOSIT_MATRIX_MEM_BATCH`, no cohort-size cap needed.

None open.

---

## Wireframe (UI)

```
┌─ Card: Royalty 21 Times ─────────────────────────────────────────────┐
│ Search form (unchanged) … [ Search ] [ Clear ]                       │
│ ┌ Tabs (shadcn) ────────────────────────────────────────────────────┐ │
│ │ [ Member detail ] [ Deposit count ] [ Deposit % ]                 │ │
│ ├───────────────────────────────────────────────────────────────────┤ │
│ │ Rank │ 1 │ 2 │ … │ 21 │ SUM                                       │ │
│ │ 0-99 │   │   │    │    │                                           │ │
│ │ …    │   │   │    │    │                                           │ │
│ └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```
