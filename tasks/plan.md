# Implementation Plan: Deposit Matrix Tabs — /ship Findings Fix-Up

## Overview

`/review` and `/ship` (code-reviewer + security-auditor + test-engineer, run in parallel) evaluated the completed Deposit Matrix Tabs feature. Ship verdict: **NO-GO** on one confirmed correctness bug (percent rounding), plus recommended hardening and test-coverage fixes. This plan closes all of them.

Full context: [tasks/todo.md](./todo.md) · Spec: [`SPEC-deposit-matrix-tabs.md`](../backend/service/branch-report/_mission-control/SPEC-deposit-matrix-tabs.md)

## Architecture Decisions

1. **Rounding fix, not a new rounding rule.** The "2dp half-up, no rebalance" rule from the original spec is correct; the bug is that `computePercentMatrix` feeds an already-imprecise float (`(cell/denom)*100`) into `roundPercent2`, which multiplies by 100 again, compounding floating-point error. Fix computes the percent directly from the integer ratio in one rounding step (`Math.round((numerator * 10000) / denominator) / 100`) via a new helper; `roundPercent2` itself is untouched (it's correct for its own contract).
2. **Cohort-size DoS risk → aggregation-pipeline rewrite, not a hard cap.** Decided with the user: instead of adding an arbitrary `DEPOSIT_MATRIX_MAX_MEMBERS` cap (risk: blocks legitimate large tenants), rewrite `findDepositMatrix` as a single MongoDB aggregation pipeline (`member` → `$lookup` deposits, top-21 by `bill_date` → `$unwind` with `includeArrayIndex` for round → `$switch` bucket (generated from `AMOUNT_BUCKETS`, single source of truth) → `$group`). This removes the Node-side batch loop and `DEPOSIT_MATRIX_MEM_BATCH` entirely — cost now scales with one DB-side aggregation, not N sequential app round-trips.
3. **Bucket boundaries stay a single source of truth.** The pipeline's `$switch` branches are generated programmatically from `AMOUNT_BUCKETS` (imported from `deposit-matrix.js`) at query-construction time — never hand-duplicated as a second static copy inside the pipeline.
4. **Sequencing protects the smaller, safer fixes.** Correctness fix (Phase 1) → test-coverage debt (Phase 2) → schema hardening (Phase 3) → aggregation-pipeline rewrite (Phase 4, own checkpoint, highest risk/effort) — in that order, so a problem in the rewrite doesn't block or get bundled with the simpler fixes. Phase 2 deliberately does **not** add tests for the 500-member batch boundary, since Phase 4 deletes batching entirely.
5. **Explicitly out of scope** (separate follow-up tickets, not blockers for this ship): service-wide missing server-side permission enforcement for `branch-report:marketing:channel-performance:read` (pre-existing, shared with sibling `list` route and other `branch-report` modules); `referring-members.repository.js`'s unscoped initial `findOne({ username })` lookup.

## Task List

### Phase 1: Correctness fix (the ship blocker)

- [x] Task 1: Fix floating-point double-scaling in percent rounding (`deposit-matrix.js`)
- [x] Task 2: Regression tests — 23/160 tie case, no-rebalance guard

### Checkpoint: Correctness

- [x] `npm test -- --test-name-pattern=deposit-matrix` green; 23/160 case manually confirmed as 14.38

### Phase 2: Test-coverage debt (no production-logic changes)

- [x] Task 3: Full `AMOUNT_BUCKETS` table + adjacent-boundary assertions
- [x] Task 4: Reverse partial-failure test (member list fails, matrix succeeds)
- [x] Task 5: Filter-validation parity tests on the deposit-matrix HTTP route
- [x] Task 6: Non-empty `affiliate_link` matrix HTTP test
- [x] Task 7: "Loading until both settle" + shared abort-controller cancellation tests
- [x] Task 8: Percent-tab page-level wiring test

### Checkpoint: Test debt

- [x] `npm test` (branch-report) green; frontend `vitest run` on touched Channel Performance files green

### Phase 3: Schema hardening

- [x] Task 9: `additionalProperties: false` on both querystring schemas + unknown-param 400 tests

### Checkpoint: Schema

- [ ] Integration tests green; existing legit query params still validate (no false-positive rejections)

### Phase 4: Architecture fix — eliminate unbounded-cohort DoS surface

- [x] Task 10: Rewrite `findDepositMatrix` as a single MongoDB aggregation pipeline
- [x] Task 11: Replace repository unit tests for the new pipeline (delete batch test, add pipeline-shape + tenant-scoping + bucket-sync assertions)
- [x] Task 12: Confirm behavioral parity via existing HTTP-level integration tests (unchanged expected values)

### Checkpoint: Architecture

- [x] `npm run ci` (branch-report) fully green
- [x] Manual diff of returned counts/rowSums against pre-rewrite baseline — byte-for-byte parity
- [x] `grep -rn DEPOSIT_MATRIX_MEM_BATCH backend/service/branch-report` returns nothing

### Checkpoint: Complete

- [x] Full `npm run ci` (branch-report) + frontend touched-file tests green
- [x] `docs/royalty-21-times.md` updated if it references batching (describe the pipeline approach instead)
- [x] Re-run `/ship` (code-reviewer + security-auditor) on the final diff — code-reviewer: **APPROVE**, no Critical/Important. security-auditor: both original HIGH findings addressed (unbounded round-trips resolved; permission-enforcement gap correctly left out of scope, unregressed); one new Medium raised (`$lookup` used `let`/`$expr` instead of `localField`/`foreignField`, risking an unindexed join) — fixed immediately, re-verified with `npm test` (124/124 green)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Aggregation-pipeline rewrite subtly changes matrix output | High | Existing HTTP-level integration tests assert exact counts/rowSums — re-run unchanged as the primary regression signal; manual parity diff in Checkpoint: Architecture |
| `$switch` bucket boundaries drift from `AMOUNT_BUCKETS` over time | Med | Generate `$switch` branches programmatically from `AMOUNT_BUCKETS` at query-build time; repository test asserts case count/values match the constant |
| Phase 2 tests accidentally couple to the soon-to-be-deleted batching design | Low | Explicit sequencing note: Phase 2 does not add batch-boundary tests |
| Rounding fix helper introduced but `roundPercent2` semantics accidentally changed | Low | `roundPercent2` left untouched; new `roundRatioToPercent` helper added instead; existing `roundPercent2` tests must still pass unchanged |

## Open Questions

None — cohort-size mitigation approach (aggregation-pipeline rewrite vs. hard cap) resolved with the user 2026-07-14.
