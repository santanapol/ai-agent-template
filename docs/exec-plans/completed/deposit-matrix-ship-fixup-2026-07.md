---
status: completed
created: 2026-07-14
updated: 2026-07-15
services: [branch-report]
---

# Plan: Deposit Matrix Tabs — /ship Findings Fix-Up

Archived from ephemeral `tasks/plan.md` + `tasks/todo.md` during repo template cleanup (2026-07-15).

**Spec:** [backend/service/branch-report/docs/SPEC-deposit-matrix-tabs.md](../../../backend/service/branch-report/docs/SPEC-deposit-matrix-tabs.md)

## Overview

`/review` and `/ship` evaluated the completed Deposit Matrix Tabs feature. Ship verdict: **NO-GO** on one confirmed correctness bug (percent rounding), plus recommended hardening and test-coverage fixes. This plan closed all of them.

## Architecture Decisions

1. **Rounding fix, not a new rounding rule.** Fix computes the percent directly from the integer ratio in one rounding step via `roundRatioToPercent`; `roundPercent2` unchanged.
2. **Cohort-size DoS risk → aggregation-pipeline rewrite, not a hard cap.** Rewrote `findDepositMatrix` as a single MongoDB aggregation pipeline; removed `DEPOSIT_MATRIX_MEM_BATCH`.
3. **Bucket boundaries stay a single source of truth.** Pipeline `$switch` generated from `AMOUNT_BUCKETS`.
4. **Sequencing:** Correctness → test debt → schema hardening → pipeline rewrite.
5. **Out of scope:** service-wide permission enforcement for invite-links/referring-members; unscoped `referring-members` lookup (later addressed in follow-ups).

## Task checklist (completed)

### Phase 1: Correctness fix

- [x] Fix floating-point double-scaling in percent rounding (`deposit-matrix.js`)
- [x] Regression tests — 23/160 tie case, no-rebalance guard

### Phase 2: Test-coverage debt

- [x] Full `AMOUNT_BUCKETS` table + adjacent-boundary assertions
- [x] Reverse partial-failure test (member list fails, matrix succeeds)
- [x] Filter-validation parity on deposit-matrix route
- [x] Non-empty `affiliate_link` matrix HTTP test
- [x] Loading until both settle + abort-controller cancellation tests
- [x] Percent-tab page-level wiring test

### Phase 3: Schema hardening

- [x] `additionalProperties: false` on both querystring schemas

### Phase 4: Architecture — aggregation pipeline

- [x] Rewrite `findDepositMatrix` as single MongoDB aggregation pipeline
- [x] Replace repository unit tests for new pipeline
- [x] Confirm behavioral parity via HTTP integration tests
- [x] `/ship` re-run — APPROVE; security findings addressed

### Follow-ups (operational)

- [ ] Ops: `.explain("executionStats")` for `findDepositMatrix` on production-sized data
- [ ] Ops: confirm compound index on `dm_dm_tn_deposit`
- [ ] Separate ticket: service-wide permission enforcement for invite-links/referring-members

## Progress log

- 2026-07-14: Plan executed; ship fix-up completed.
- 2026-07-15: Archived from `tasks/` to `docs/exec-plans/completed/` (template cleanup).
