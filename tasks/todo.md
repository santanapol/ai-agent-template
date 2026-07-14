# Todo: Deposit Matrix Tabs — /ship Findings Fix-Up

Source: [plan.md](./plan.md) · Spec: [`SPEC-deposit-matrix-tabs.md`](../backend/service/branch-report/_mission-control/SPEC-deposit-matrix-tabs.md)

## Phase 1: Correctness fix (ship blocker)

- [x] **Task 1:** Fix floating-point double-scaling in percent rounding
  - Acceptance: `computePercentMatrix` computes percents directly from the integer ratio (one rounding step), not `roundPercent2((cell/denom)*100)`; `roundRatioToPercent(23, 160) === 14.38`; `roundPercent2` itself unchanged
  - Verify: `cd backend/service/branch-report && npm test -- --test-name-pattern=deposit-matrix`
  - Files: `src/lib/deposit-matrix.js`

- [x] **Task 2:** Regression tests for the rounding fix
  - Acceptance: test asserts the 23/160 case now yields `14.38` (not `14.37`); test asserts a column that doesn't sum to exactly 100% is left un-rebalanced
  - Verify: same as Task 1
  - Files: `src/lib/deposit-matrix.test.js`

## Checkpoint: Correctness

- [x] Rounding tests green; 23/160 case manually confirmed

## Phase 2: Test-coverage debt (no production-logic changes)

- [x] **Task 3:** Full bucket-table + adjacent-boundary assertions
  - Acceptance: all 9 `AMOUNT_BUCKETS` entries' `key`/`min`/`max` asserted; `amountBucketIndex` asserted on every adjacent boundary pair (`199/200`, `299/300`, `499/500`, `999/1000`, `4999/5000`, `9999/10000`)
  - Verify: `npm test -- --test-name-pattern=deposit-matrix`
  - Files: `src/lib/deposit-matrix.test.js`

- [x] **Task 4:** Reverse partial-failure test (frontend)
  - Acceptance: `getRoyalty21Times` rejects, `getDepositMatrix` resolves → error toast for member report, member table empty/error state, Deposit count/% tabs still render matrix data
  - Verify: `cd frontend/backoffice-next && npx vitest run src/views/branch-report/marketing/ChannelPerformancePage.test.tsx`
  - Files: `src/views/branch-report/marketing/ChannelPerformancePage.test.tsx`

- [x] **Task 5:** Filter-validation parity on the deposit-matrix route
  - Acceptance: deposit-matrix route has the same validation-error test coverage as the list route (invalid `channelType`, invalid/foreign `inviteLinkId`, missing reg dates, `regDateFrom > regDateTo`, range `> 366` days) — add only what's missing
  - Verify: `npm test` in branch-report
  - Files: `test/royalty-21-times.integration.test.js`

- [x] **Task 6:** Non-empty `affiliate_link` matrix HTTP test
  - Acceptance: seeded, non-empty `affiliate_link` case asserts real counts/rowSums (not just the empty-cohort path)
  - Verify: same as Task 5
  - Files: `test/royalty-21-times.integration.test.js`

- [x] **Task 7:** "Loading until both settle" + shared abort-controller cancellation tests
  - Acceptance: loading state stays true until both list + matrix requests resolve; a second Search fired mid-flight aborts the first request for both calls
  - Verify: `npx vitest run src/views/branch-report/marketing/ChannelPerformancePage.test.tsx`
  - Files: `src/views/branch-report/marketing/ChannelPerformancePage.test.tsx`

- [x] **Task 8:** Percent-tab page-level wiring test
  - Acceptance: switching to "Deposit %" tab after a successful search renders percent-derived values at the page level (not just in the isolated component test)
  - Verify: same as Task 7
  - Files: `src/views/branch-report/marketing/ChannelPerformancePage.test.tsx`

## Checkpoint: Test debt

- [x] `npm test` (branch-report) green; `npx vitest run` on touched Channel Performance files green

## Phase 3: Schema hardening

- [x] **Task 9:** `additionalProperties: false` on both querystring schemas
  - Acceptance: both `royalty21TimesQuerySchema.querystring` and `royalty21DepositMatrixQuerySchema.querystring` strip unknown params (Fastify's default `removeAdditional` — not a 400, confirmed by test); all legit existing params still validate
  - Verify: `npm test` in branch-report
  - Files: `src/modules/royalty-21-times/royalty-21-times.schema.js`, `test/royalty-21-times.integration.test.js`

## Checkpoint: Schema

- [x] Integration tests green; no false-positive rejections of legit params

## Phase 4: Architecture fix — eliminate unbounded-cohort DoS surface

- [x] **Task 10:** Rewrite `findDepositMatrix` as a single MongoDB aggregation pipeline
  - Acceptance: `member` → `$lookup` deposits (top-21 by `bill_date`, tenant+status scoped) → `$unwind` with `includeArrayIndex` for round → `$switch` bucket (generated from `AMOUNT_BUCKETS`) → `$group` by `{bucketIndex, round}`; no Node-side batch loop; `DEPOSIT_MATRIX_MEM_BATCH` removed; `aggregateDepositSlots` (used by `fetchMemberMetrics`) left unchanged
  - Verify: `npm run ci` in branch-report
  - Files: `src/modules/royalty-21-times/royalty-21-times.repository.js`

- [x] **Task 11:** Replace repository unit tests for the new pipeline
  - Acceptance: obsolete 500/501-batch test deleted; new tests assert grouped-row reduction into `counts[][]`, tenant scoping present in both the outer `$match` and `$lookup` sub-pipeline `$match`, and `$switch` case values match `AMOUNT_BUCKETS`
  - Verify: same as Task 10
  - Files: `src/modules/royalty-21-times/royalty-21-times.repository.test.js`

- [x] **Task 12:** Confirm behavioral parity via existing HTTP-level integration tests
  - Acceptance: existing `counts`/`rowSums` assertions in the integration tests pass unchanged against the new pipeline implementation
  - Verify: `npm test` in branch-report; manual diff against pre-rewrite baseline values
  - Files: `test/royalty-21-times.integration.test.js`

## Checkpoint: Architecture

- [x] `npm run ci` (branch-report) fully green (lint/format/spec/tests/audit — 5 pre-existing unrelated format warnings untouched by this work)
- [x] Manual parity diff confirmed (byte-for-byte — same counts/rowSums assertions pass against the new pipeline)
- [x] `grep -rn DEPOSIT_MATRIX_MEM_BATCH backend/service/branch-report` → no results

## Checkpoint: Complete

- [x] Full `npm run ci` (branch-report) + frontend touched-file tests green (124 backend + 53 frontend)
- [x] `docs/royalty-21-times.md` + `SPEC-deposit-matrix-tabs.md` updated to describe the pipeline approach (batching references amended/struck through)
- [x] `/ship` (code-reviewer + security-auditor) re-run on final diff — code-reviewer APPROVE (no Critical/Important); security-auditor confirmed both original HIGH findings addressed, raised one new Medium (`$lookup` indexed-join form) — fixed and re-verified (124/124 backend tests green)

## Acknowledged risks — resolved 2026-07-14

- [x] **Server-side permission enforcement for `branch-report:marketing:channel-performance:read`.** Added `permissions` parsing to `src/plugins/user-context.js` (reads gateway-forwarded `x-user-permissions` header, already arriving unused before this fix). Copied the in-repo `requirePermission`/`permission-match` pattern from `agent-invoice` into `src/lib/require-permission.js` + `src/lib/permission-match.js`. Wired `preHandler: requirePermission(CHANNEL_PERFORMANCE_READ_PERMISSION)` onto both `list` and `deposit-matrix` routes in `royalty-21-times.route.js`. Added integration tests proving `403 PERMISSION_DENIED` without the permission on both routes; updated `validUserHeaders` fixture to carry the permission so existing tests represent an authorized user. Scope intentionally limited to these two routes (not `invite-links`/`referring-members`, which remain unenforced service-wide — a separate, broader hardening ticket).
- [x] **`referring-members.repository.js` unscoped initial `findOne({username})`.** Added `ou_id`/`branch_id` to the first lookup query, matching the repo's "every query must include tenant scope" rule and closing the cross-tenant-username-collision false-negative edge case.

## Follow-ups (operational, not fixable from code alone)

- [ ] Ops: run `.explain("executionStats")` for `findDepositMatrix` against a realistic/production-sized `dm_dm_tn_deposit` collection to confirm the `$lookup` (now `localField`/`foreignField`) uses an indexed join, not a collection scan
- [ ] Ops: confirm a compound index exists on `dm_dm_tn_deposit` covering `(mem_id, ou_id, branch_id, status, bill_date)` — no index-provisioning code for this collection exists in this repo (checked), so it must be managed elsewhere
- [ ] Separate ticket (still out of scope): service-wide server-side permission enforcement for `invite-links`/`referring-members` (same gap pattern, other modules) — the `royalty-21-times` pair is now fixed, but the underlying `requirePermission` helper could be reused there too
