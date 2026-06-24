# Code Review #5 (Verification) — Dynamic Permission Rollout (Phase 1–5)

**Date:** 2026-06-15
**Scope:** verify fixes applied per [`review-4-todo.md`](./review-4-todo.md) — **uncommitted working-tree changes** vs baseline `692882f` (now 39 files, +1227/−249, up from 33 files/+897/−176 in Round 4)
**Method:** `/review` Round 5 — 3 parallel verification agents (auth / staff / frontend), each actually running the relevant test/lint/build/spec commands against real MongoDB where available.
**Verdict:** ⚠️ **Request Changes — very close.** All 7 Round-5 functional goals (R5-1, R5-2, R5-4, R5-5's auth half, R5-5's staff half, R5-6's depth-guard, R5-7's openapi/todo updates) are genuinely done and pass at the **test-runtime** level — `backend/auth` 134/134, `backend/service/staff` integration **205/205 (up from 194/200)**, `frontend` vitest 84/84 with **0 act() warnings**. But **each of the 3 areas introduced its own small, mechanical, NEW CI-breaking issue** this round (frontend `tsc -b`/`build`/`eslint` all fail; staff `npm run ci` fails at lint+format; auth ships an unregistered error code) — none touch the actual permission logic, all are trivial fixes.

---

## TL;DR

✅ **R5-1 (auth) — `npm run ci` fully PASSES** (134/134 tests, 0 lint errors, format clean, 0 audit vulns) — first time this gate is fully green.

✅ **R5-2 (staff) — all 6 previously-failing integration tests now pass, suite is 205/205** (up from 194/200 in Round 4):

- `profiles.lifecycle.test.js:239` now fetches a real `If-Match` etag first → 403 as expected.
- Archive/Restore tests in `profiles.permissions.test.js` now send `payload: {}` → 200/403 as expected.
- Reset Password URL fixed `/reset-password` → `/password` → 204.
- **New `mock-auth-internal-server.js` handler** for `PATCH /internal/users/:id/role` lets the Update Role test get a real 204 instead of 503.

✅ **R5-4 (staff) — `request.log`/`reqId` threading is fully wired end-to-end** through `assertPermission` and all its wrapper functions, from controller → service → permission check. `env.test.js` now has a `PERMISSION_MODE` validation test (4/4 pass), and `profiles.service.unit.test.js`'s new `assertPermission` block correctly uses `afterEach(() => resetRuntimeEnvForTests())` (37/37 pass).

✅ **R5-5 — `unauthorizedServiceOutcome()` now always populates `.problem`**, so `admin.route.js`'s hardcoded fallback `genCheck.problem ?? problemPayload({...})` is gone — exactly as requested. Staff side: 4 new "fails with 403 without permission" tests (Archive/Restore/Reset-Password/Update-Role) all pass.

✅ **R5-6 — AdminLayout now has a real depth guard** (`depth > 5` → `console.warn` + bail), a passing test for it, and **all act() warnings are gone** (0 across the full 84-test suite, down from 5+6 in Round 4).

✅ **R5-7 — `tasks/todo.md` Phase A checkboxes synced to reality**, and the new ask (403 responses added to the 6 admin endpoints with 401-but-no-403 in `openapi.yaml`) is done correctly and scoped accurately (`spec:lint`/`spec:codes` pass).

❌ **[NEW-CRITICAL-3] `frontend/backoffice`: `npx tsc -b`, `npm run build`, and `npx eslint .` all FAIL** — 6 new TS errors + 2 new ESLint errors, all in the 3 new/changed test files from R5-3/R5-6 (`StaffTable.test.tsx`, `StaffManagement.test.tsx`, `AuthContext.test.tsx`). All are trivial (unused imports, mock objects not matching real types).

❌ **[NEW-CRITICAL-4] `backend/service/staff`: `npm run ci` FAILS** — 1 new `no-unused-vars` ESLint error (`profiles.service.unit.test.js:1`, unused `after` import) + 4 files fail `prettier --check` (new R5-4 code: `env.test.js`, `mock-auth-internal-server.js`, `profiles.controller.js`, `profiles.service.js`).

⚠️ **[NEW-IMPORTANT-1] `admin.service.js`'s `deleteMenu` now uses `code: 'AUTH_MENU_IN_USE'`@409** (fixing the previous status/type mismatch), but **this code is not registered** in `coding-standard/auth/codes.yaml` or `openapi.yaml`'s `Problem.code` enum — a new instance of the exact class of bug R3-4/R3-5 fixed for `AUTH_ROLE_PERMISSION_IN_USE`. `spec:codes` doesn't catch it because nothing in `openapi.yaml` references this code.

⚠️ **R5-7's index decision still not done** (carried 4 rounds now: R3-11 → R4-8 → R5-7 → still open) — `tasks/plan.md`'s diff remains 100% cosmetic reformatting, no decision text anywhere.

⚠️ **R5-6's T6.11.1 (orphaned `parent_key`) still untested**, and the new T6.11.2 test covers _depth_ (linear chain >5 levels) rather than a literal `A→B→A` cycle — traced manually, a true cycle produces **no warning** at all (both nodes' parents exist in `itemMap`, so neither becomes a root, `sortItems([])` is a no-op). Not a new bug (same safe-by-construction algorithm as Round 1), but the warning string's "...or contains a cycle" claim is untested.

⚠️ **R5-3's `StaffManagement.test.tsx` Edit-action assertion is a no-op** — both tests mock `listProfiles` to return `data: []`, so the table is always empty and the `canEdit`/`onEdit` wiring (`StaffManagement.tsx:362`) is never actually exercised, despite the task asking to verify "Edit action" visibility.

---

## Per-task verification table

| #    | Task                                                                                                    | Severity   | Status                | Detail                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5-1 | [Auth] fix 2 eslint errors blocking `npm run ci`                                                        | Critical   | ✅ **Done correctly** | Unused `ObjectId` import and `menus` fixture removed; `npm run ci` passes (134/134, 0 lint err, format clean, 0 audit vulns).                                                                                                                                             |
| R5-2 | [Staff] fix 6 failing integration tests                                                                 | Critical   | ✅ **Done correctly** | All 6 fixed via etag-first, `payload: {}`, URL fix, and new mock-auth-internal-server handler. Full suite **205/205** (target 200/200; +5 because R5-5 added 4 new 403 tests).                                                                                            |
| R5-3 | [Frontend] `StaffTable.test.tsx`/`StaffManagement.test.tsx`                                             | Suggestion | ⚠️ **Partial**        | Both files exist, both pass at runtime (2/2 each) — but introduce 6 TS errors + 2 eslint errors breaking `tsc -b`/`build`/`eslint` (NEW-CRITICAL-3). `StaffManagement.test.tsx`'s Edit-action check is a no-op (empty-profiles mock).                                     |
| R5-4 | [Staff] `request.log` threading, `env.test.js` PERMISSION_MODE test, `resetRuntimeEnvForTests` per-test | Suggestion | ✅ **Done correctly** | Full end-to-end threading verified (3 chains traced); `env.test.js` 4/4; `profiles.service.unit.test.js` 37/37 with correct `afterEach`.                                                                                                                                  |
| R5-5 | [Auth] `genCheck.problem` fallback robustness + `deleteMenu` code fix; [Staff] new 403 tests            | Important  | ⚠️ **Partial**        | `unauthorizedServiceOutcome()` now always sets `.problem` ✅. `deleteMenu`'s 3×409 now use `AUTH_MENU_IN_USE` (status/type fixed) but **this code is unregistered** (NEW-IMPORTANT-1). Staff: all 4 new 403-tests pass ✅.                                                |
| R5-6 | [Frontend] AdminLayout cycle/depth test (T6.11.1/T6.11.2) + act() warnings                              | Suggestion | ⚠️ **Partial**        | Real `depth > 5` guard added + passing test (T6.11.2-as-depth) ✅. act() warnings fully resolved (0/84) ✅. T6.11.1 (orphaned `parent_key`) not tested ❌; true `A→B→A` cycle not tested/doesn't actually warn ❌.                                                        |
| R5-7 | [Auth] index decision, `tasks/todo.md` sync, NEW openapi 403 additions                                  | Suggestion | ⚠️ **Partial**        | `tasks/todo.md` Phase A sync ✅ done correctly. NEW 403-response additions to 6 admin endpoints ✅ done, `spec:lint`/`spec:codes` pass. Index decision (`auth_menus` `{type:1,ou_id:1}` vs `auth_users` `by_ou_role`) ❌ still not addressed anywhere — carried 4 rounds. |

---

## New Critical findings (this round)

### [NEW-CRITICAL-3] `frontend/backoffice`: `tsc -b` / `npm run build` / `eslint .` all FAIL — 6 TS errors + 2 ESLint errors

```
src/components/staff/StaffTable.test.tsx(3,1): error TS6133: 'React' is declared but its value is never read.
src/components/staff/StaffTable.test.tsx(33,13): error TS2322: ... missing properties from type 'StaffProfile': user_id, ou_id, branch_id, user
src/components/staff/StaffTable.test.tsx(39,13): error TS2322: ... (same, second test case)
src/contexts/AuthContext.test.tsx(2,35): error TS6133: 'act' is declared but its value is never read.
src/pages/StaffManagement.test.tsx(6,1): error TS6133: 'AuthProvider' is declared but its value is never read.
src/pages/StaffManagement.test.tsx(43,7): error TS2353: Object literal may only specify known properties, and 'meta' does not exist in type 'ApiEnvelope<StaffProfile[]>'.
```

All 6 TS errors + the 2 matching ESLint `no-unused-vars` errors (`AuthContext.test.tsx:2`, `StaffManagement.test.tsx:6`) are in the 3 new/edited test files from this round. None affect production code (`AdminLayout.tsx`'s depth guard, `StaffTable.tsx`/`StaffManagement.tsx`'s permission-gating are all unaffected and correct).

**Fix outline:**

- `StaffTable.test.tsx` — remove unused `React` import (not needed with the new JSX transform); add the missing `user_id`/`ou_id`/`branch_id`/`user` fields to `mockProfiles` entries (match `types/staff.ts:22-33`'s `StaffProfile` shape).
- `AuthContext.test.tsx` — remove unused `act` import (the file already uses `waitFor`/`userEvent` without it).
- `StaffManagement.test.tsx` — remove unused `AuthProvider` import (the local mock factory shadows it); change the `listProfiles` mock's `meta` key to `pagination` and add the required `success`/`code` fields per `ApiEnvelope<T>` (`types/staff.ts:8-15`).

### [NEW-CRITICAL-4] `backend/service/staff`: `npm run ci` FAILS — 1 lint error + 4 files fail `prettier --check`

```
src/modules/profiles/tests/unit-test/profiles.service.unit.test.js
  1:32  error  'after' is defined but never used  no-unused-vars
```

`profiles.service.unit.test.js:1` imports `after` from `node:test` but only uses `afterEach`. One-token fix.

```
[warn] src/config/tests/unit-test/env.test.js
[warn] src/lib/test-helpers/mock-auth-internal-server.js
[warn] src/modules/profiles/profiles.controller.js
[warn] src/modules/profiles/profiles.service.js
```

All 4 are new R5-4 code with trailing-comma/line-wrap Prettier violations. `npx prettier --write .` resolves all 4 mechanically.

---

## New Important finding (this round)

### [NEW-IMPORTANT-1] `AUTH_MENU_IN_USE`@409 is used but not registered

`admin.service.js:264,280,300` (`deleteMenu`'s "children exist" / "referenced in role permissions" / "wildcard would match zero actions" branches) now send `code: 'AUTH_MENU_IN_USE'` with `status: 409` — this correctly fixes the previous status/type mismatch (`AUTH_INVALID_REQUEST`@400 used at 409). However:

- `coding-standard/auth/codes.yaml` has no `AUTH_MENU_IN_USE` entry.
- `openapi.yaml`'s `Problem.code` enum (~line 1251-1266) doesn't include it either.
- `src/lib/problem.js`'s own docstring contract states every client-facing `code` **must** be registered in `codes.yaml`.

This is the same class of issue R3-4/R3-5 fixed for `AUTH_ROLE_PERMISSION_IN_USE`, now recurring for a new code. `spec:codes` doesn't catch it because nothing in `openapi.yaml` documents `deleteMenu`'s 409 response with this code yet.

**Fix:** add `AUTH_MENU_IN_USE: { httpStatus: 409 }` to `codes.yaml`, and add it to `openapi.yaml`'s `Problem.code` enum (and ideally a 409 response example on `DELETE /auth/admin/menus/{key}`).

---

## Suggestions (carried, still open)

- **R5-7 index decision** (carried 4 rounds: R3-11 → R4-8 → R5-7) — explicitly decide and document in `tasks/plan.md` whether `{type:1,ou_id:1}` on `auth_menus` is still wanted, or close the item as "superseded by `by_ou_role` on `auth_users`".
- **R5-6 T6.11.1** — add a test for orphaned `parent_key` (parent not present in `menus`) — should not crash, item becomes unreachable/dropped silently.
- **R5-6 T6.11.2 cycle vs depth** — either add a genuine `A→B→A` test (and confirm/fix that the algorithm handles it gracefully, even if silently/without warning), or adjust the `console.warn` message to not claim cycle-detection if only depth is guarded.
- **R5-3 StaffManagement.test.tsx** — give the "permission granted" test case a non-empty `listProfiles` mock so the `canEdit`/`onEdit`-gated Edit button visibility is actually exercised (currently the table is always empty).

---

## Verification results

| Area                    | Tests                                                                                                                          | Lint                                                   | Format                                                | Build/Spec                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `backend/auth`          | `npm test` → **134/134 pass**                                                                                                  | `npm run lint` ✅ **pass**                             | `format:check` ✅ pass                                | `spec:lint`/`spec:codes`/`audit:check` all pass; **`npm run ci` PASSES** ✅ (first time) |
| `backend/service/staff` | full `npm test` (real MongoDB) → **205/205 pass** (was 194/200); unit `env.test.js` 4/4, `profiles.service.unit.test.js` 37/37 | `npm run lint` ❌ **FAIL — 1 error** (NEW-CRITICAL-4)  | `format:check` ❌ **FAIL — 4 files** (NEW-CRITICAL-4) | `spec:lint` pass ×2; **`npm run ci` FAILS** (lint+format)                                |
| `frontend/backoffice`   | `npx vitest run` → **84/84 pass, 15/15 files** — **0 act() warnings** (down from 11 in Round 4)                                | `npx eslint .` ❌ **FAIL — 2 errors** (NEW-CRITICAL-3) | —                                                     | `npx tsc -b` ❌ **FAIL — 6 errors**; `npm run build` ❌ **FAILS** (NEW-CRITICAL-3)       |

---

## Recommended Round 6 fix order

1. **[NEW-CRITICAL-3]** Fix the 6 TS errors + 2 eslint errors in `StaffTable.test.tsx`, `StaffManagement.test.tsx`, `AuthContext.test.tsx` — all trivial (unused imports + mock shapes). Unblocks `tsc -b`/`build`/`eslint`.
2. **[NEW-CRITICAL-4]** Remove unused `after` import in `profiles.service.unit.test.js:1`; run `npx prettier --write .` on the 4 flagged files. Unblocks `npm run ci` for staff.
3. **[NEW-IMPORTANT-1]** Register `AUTH_MENU_IN_USE`@409 in `codes.yaml` + `openapi.yaml`'s `Problem.code` enum.
4. R5-3: fix `StaffManagement.test.tsx`'s empty-profiles mock so the Edit-action visibility check is real.
5. R5-6: add T6.11.1 (orphaned `parent_key`) test; resolve the cycle-vs-depth gap for T6.11.2.
6. R5-7: finally close the `auth_menus` index decision in `tasks/plan.md` — 4th round carried.

ดู checklist แบบ checkbox ที่ [`review-5-todo.md`](./review-5-todo.md)
