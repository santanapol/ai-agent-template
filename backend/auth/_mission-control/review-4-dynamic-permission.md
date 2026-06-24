# Code Review #4 (Verification) — Dynamic Permission Rollout (Phase 1–5)

**Date:** 2026-06-15
**Scope:** verify fixes applied per [`review-3-todo.md`](./review-3-todo.md) — **uncommitted working-tree changes** vs baseline `692882f` (now 33 files, +897/−176, up from 31 files/+667/−161 in Round 3)
**Method:** `/review` Round 4 — 3 parallel verification agents (auth / staff / frontend). For the first time, **MongoDB is reachable** in this sandbox, so `backend/service/staff`'s full integration suite actually ran (200 tests) instead of being cancelled.
**Verdict:** ⚠️ **Request Changes — 2 small, mechanical CI-breaking regressions** (both newly introduced this round), but **this is the strongest round yet**: nearly all Round-3 Important items (R4-2, R4-3, R4-4, R4-5, R4-10-frontend, openapi mirror) are now ✅ done and verified passing with real tests, plus a long-standing Round-1 gap (Staff Management Create/Edit permission-gating) was finally closed correctly.

---

## TL;DR

✅ **R4-2, R4-4, R4-5 (auth) — all done correctly, verified with real passing tests:**

- R4-2: 2 new integration tests in `admin.integration.test.js` — self-revoke→401 (CRITICAL-2 regression test) and DELETE-blocked-409/confirm→204 (R3-5 regression test). **15/15 pass.**
- R4-4: `openapi.yaml`'s `DELETE .../role-permissions/{ou_id}/{role}` now documents `confirm` param + 400/403/404/409 `$ref: Problem` responses. `spec:lint`/`spec:codes` pass.
- R4-5: `permission-validation.js`'s keyword-substring heuristic replaced with explicit `ESCALATING_ACTIONS = new Set(['roles:assign','permissions:manage'])` allow-list. New unit test in `seed-permissions.test.js` passes.

✅ **Bonus real fix discovered: `permissions:manage` was missing from seed data** — `seed-data/permissions.js` now adds the `permissions:manage` action menu node AND adds it to `platform_admin.menu_keys`. Without this, a freshly-seeded `platform_admin` could not call **any** `/auth/admin/*` endpoint — this was a latent deploy-blocker fixed as a side-effect of R4-5's allow-list work.

✅ **R4-3, R4-10 (frontend) — done correctly:** `AdminLayout.tsx` now has a real recursive `toAntdMenuItems()` mapper (no `any`/`unknown` anywhere), unused `disabled` field removed, `MenuItemType`/mapper hoisted to module scope. `tsc -b`/`eslint`/`vitest` all clean (79/79).

✅ **R4-6 (openKeys) and R4-10 (openapi-via-gateway mirror, staff) — done correctly.**

✅ **R4-9's production code is genuinely new and correct** — `StaffTable.tsx`/`StaffManagement.tsx` now wire `usePermission('profiles:create'|'profiles:edit')` to gate the Create button and the Edit action, finally closing the gap flagged all the way back in **Round 1's Task 10**. (The two requested _test files_ still don't exist, though.)

❌ **NEW-CRITICAL-1 — `npm run ci` now FAILS in `backend/auth`** due to 2 new ESLint `no-unused-vars` errors introduced by this round's own cleanup:

- `admin.route.js:4` — `import { ObjectId } from 'mongodb'` is now dead (its only use was the dead-code fallback removed by R4-10).
- `test/seed-permissions.test.js:131` — leftover unused `const menus = [...]` fixture.
  `lint`/`format:check`/`test`/`audit:check` all pass _individually_, but `npm run ci` chains `lint && ...` so it stops dead at the lint step.

❌ **NEW-CRITICAL-2 — `backend/service/staff`'s full `npm test` is now 194/200 (6 failures)** — the first time this suite has actually run against real MongoDB in this review cycle. R4-1's 3 specifically-described sub-bugs **were each fixed exactly as requested** (verified by trace), but running for real surfaces **6 failures from different root causes**:

1. `profiles.lifecycle.test.js:239` "archive returns 403" → **412** — a **pre-existing, untouched (zero-diff) sibling** of R3/R4-1's archive-403 bug (same `parseIfMatchHeader`-preempts-permission-check pattern, different file, never fixed).
   2-4. `profiles.permissions.test.js:305,335,375` (Archive succeeds/fails-403, Restore succeeds) → **500** — `buildMeshHeaders()` sets `content-type: application/json` but these `POST .../archive|restore` calls send no `payload`, so Fastify rejects with `FST_ERR_CTP_EMPTY_JSON_BODY` before the handler runs.
2. `profiles.permissions.test.js:414` Reset Password → **404** — test calls `POST .../reset-password`, but the real route is `POST .../password` (`profiles.route.js:52-53`).
3. `profiles.permissions.test.js:456` Update Role → **503** — `changeProfileRole` calls out to `AUTH_INTERNAL_BASE_URL=http://127.0.0.1:3001`, nothing listens there in this sandbox (environment limitation, not necessarily a code bug — but unverified).

---

## Per-task verification table

| #     | Task                                                                                                                                    | Severity   | Status                                                         | Detail                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4-1  | [Staff] fix 3 bugs in `profiles.permissions.test.js` enforce tests                                                                      | Important  | ⚠️ **Partial — described sub-bugs fixed, but suite still red** | Sub-bug 1 (Archive 403 vs 412): now fetches a real `If-Match` etag first ✅ — static trace gives 403, but actual run gives **500** for a _different_ reason (see NEW-CRITICAL-2 #2-3). Sub-bug 2 (Reset Password field/status): `password`/`204` fixed ✅, but actual run gives **404** (wrong URL, NEW-CRITICAL-2 #5). Sub-bug 3 (Update Role status): `204` fixed ✅, but actual run gives **503** (NEW-CRITICAL-2 #6). |
| R4-2  | [Auth] add self-revoke→401 + DELETE 409/204-confirm integration tests                                                                   | Important  | ✅ **Done correctly**                                          | `admin.integration.test.js:325-386`, both new tests pass; full suite 15/15.                                                                                                                                                                                                                                                                                                                                               |
| R4-3  | [Frontend] replace `as unknown as AntdMenuItem[]` with real mapper                                                                      | Important  | ✅ **Done correctly**                                          | `AdminLayout.tsx:43-50` `toAntdMenuItems()`, no `any`/`unknown` anywhere; `disabled` field removed; `tsc -b`/`eslint` clean.                                                                                                                                                                                                                                                                                              |
| R4-4  | [Auth] document `confirm` param + 400/404/409 on `DELETE role-permissions`                                                              | Important  | ✅ **Done correctly**                                          | `openapi.yaml` updated, `spec:lint`/`spec:codes` pass.                                                                                                                                                                                                                                                                                                                                                                    |
| R4-5  | [Auth] escalating-action allow-list (R3-8)                                                                                              | Suggestion | ✅ **Done correctly**                                          | `permission-validation.js:76-86` `ESCALATING_ACTIONS` Set; new test in `seed-permissions.test.js:130-175` passes.                                                                                                                                                                                                                                                                                                         |
| R4-6  | [Frontend] AdminLayout openKeys + cycle/depth test + act() warnings (R3-9)                                                              | Suggestion | ⚠️ **Partial**                                                 | `openKeys`/`onOpenChange` ✅ done (`AdminLayout.tsx:169,229-233`). Cycle/depth-guard test ❌ not added. `act()` warnings ❌ not fixed — `AuthContext.test.tsx` still 5×, `AdminLayout.test.tsx` **regressed 4→6×** (new `openKeys`-sync `useEffect`).                                                                                                                                                                     |
| R4-7  | [Staff] request.log threading + env test + resetRuntimeEnvForTests (R3-10)                                                              | Suggestion | ❌ **Not done**                                                | `assertPermission` now accepts `{log}` but **all 5 call sites** still omit it (`profiles.service.js:78,87,138,178,213`) — fallback always uses module logger. `env.test.js` zero diff, still 2/2. `resetRuntimeEnvForTests()` called once in `after()`, not per-test `afterEach` (`profiles.service.unit.test.js:362-401`).                                                                                               |
| R4-8  | [Auth] `auth_menus` index decision + `tasks/todo.md` status (R3-11)                                                                     | Suggestion | ❌ **Not done**                                                | Same `{ou_id:1,role:1}`/`by_ou_role` on `auth_users` as Round 3; requested `auth_menus` index never added; `tasks/todo.md` zero diff.                                                                                                                                                                                                                                                                                     |
| R4-9  | [Frontend] `StaffTable.test.tsx`/`StaffManagement.test.tsx` (R3-12)                                                                     | Suggestion | ⚠️ **Partial**                                                 | Test files ❌ still don't exist. But **production code is new and correct**: `StaffTable.tsx`/`StaffManagement.tsx` now wire `usePermission('profiles:create'\|'profiles:edit')` to gate Create button / Edit action — closes Round-1 Task 10's gap.                                                                                                                                                                      |
| R4-10 | housekeeping: `admin.route.js` dead code, `deleteMenu` codes, `openapi-via-gateway.yaml` mirror, frontend module-scope hoist, 403 tests | Suggestion | ⚠️ **Partial**                                                 | `genCheck.user` simplified ✅; `genCheck.problem` fallback ❌ still hardcoded; `deleteMenu`'s 3×409/`AUTH_INVALID_REQUEST`@400 mismatch ❌ unchanged, no `AUTH_MENU_IN_USE`. `openapi-via-gateway.yaml` `/role` mirror ✅ done, `spec:lint` passes. Frontend `MenuItemType` module-scope hoist ✅ done (✅ counted under R4-3/R4-10-frontend). New 403-tests for Restore/Reset-Password/Update-Role ❌ not added.         |

---

## New Critical findings (this round)

### [NEW-CRITICAL-1] `npm run ci` fails in `backend/auth` — 2 new ESLint `no-unused-vars` errors

```
backend/auth/src/modules/admin/admin.route.js
  4:10  error  'ObjectId' is defined but never used  no-unused-vars

backend/auth/test/seed-permissions.test.js
  131:9  error  'menus' is assigned a value but never used  no-unused-vars
```

- `admin.route.js:4` — `import { ObjectId } from 'mongodb'` was only used by the dead-code fallback `genCheck.user ?? (await authService.repo.findUserById(new ObjectId(userId)))`, which R4-10 correctly simplified to `const user = genCheck.user`. The now-unused import was left behind.
- `seed-permissions.test.js:131-136` — a leftover draft `const menus = [...]` block; the test actually uses `menusWithRolesUnderProfiles` (139-144) and `menusWithPermUnderPermDomain` (161-166).

**Impact:** `npm run ci` = `lint && format:check && test && audit:check` — this stops at step 1. `format:check` (pass), `test` (134/134 pass), `audit:check` (pass) all work fine standalone, but the chained gate is red.

**Fix:** delete both unused identifiers — 2-line fix.

### [NEW-CRITICAL-2] `backend/service/staff`'s `npm test` → **194/200 pass, 6 fail** (MongoDB reachable for the first time this cycle)

This is the first round where the staff integration suite could actually run end-to-end. Full breakdown:

| #   | Test                                                                                  | Got | Expected | Root cause                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------- | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `profiles.lifecycle.test.js:239` "staff role archive returns 403 PERMISSION_DENIED"   | 412 | 403      | Sends `if-match: 'W/"dGVzdC1ldGFn"'` (decodes to non-date `"test-etag"`) → `parseIfMatchHeader` throws 412 before the permission check runs. **Same root-cause class as R3's archive-403 bug** (parseIfMatchHeader still runs before the permission check in `transitionProfileStatus`), but in a **different, zero-diff file** that R4-1 didn't touch. |
| 2   | `profiles.permissions.test.js:305` Archive "succeeds with profiles:edit"              | 500 | 200/204  | `buildMeshHeaders()` (`src/lib/test-helpers/mesh-headers.js:20`) unconditionally sets `content-type: application/json`; this `POST .../archive` sends no `payload` → `FST_ERR_CTP_EMPTY_JSON_BODY` (500) before the route handler runs.                                                                                                                 |
| 3   | `profiles.permissions.test.js:335` Archive "fails with 403 ... without profiles:edit" | 500 | 403      | Same content-type/empty-body cause as #2 — R4-1's etag fix was necessary but not sufficient.                                                                                                                                                                                                                                                            |
| 4   | `profiles.permissions.test.js:375` Restore "succeeds with profiles:edit"              | 500 | 200/204  | Same content-type/empty-body cause as #2.                                                                                                                                                                                                                                                                                                               |
| 5   | `profiles.permissions.test.js:414` Reset Password "succeeds with profiles:edit"       | 404 | 204      | Test calls `POST .../profiles/{id}/reset-password`; real route is `POST .../profiles/{id}/password` (`profiles.route.js:52-53`, `openapi.yaml:438`).                                                                                                                                                                                                    |
| 6   | `profiles.permissions.test.js:456` Update Role "succeeds with roles:assign"           | 503 | 204      | `changeProfileRole` → `authClient.setUserRole(...)` → `AUTH_INTERNAL_BASE_URL=http://127.0.0.1:3001`, nothing listens there in this sandbox. Likely an environment limitation rather than a code bug, but **unverified**.                                                                                                                               |

**Fix outline:**

- #1: apply the same "fetch a real `If-Match` etag first" fix R4-1 applied to `profiles.permissions.test.js`'s Archive-403 test, to `profiles.lifecycle.test.js:239`.
- #2-4: add `payload: {}` to the archive/restore `POST` calls in `profiles.permissions.test.js` (lines ~305, 335, 375), matching how other passing tests in the same file send requests.
- #5: change test URL from `/reset-password` → `/password`.
- #6: either stand up/mock an `auth-internal` responder for this test, or document that this test requires `AUTH_INTERNAL_BASE_URL` to be live and is expected to be skipped/fail in isolation.

---

## Suggestions (carried, still open)

- R4-7: thread `request.log`/`reqId` through `assertPermission` and its 5 call sites for fallback-hit logging correlation; add a `PERMISSION_MODE` validation test to `env.test.js`; switch `resetRuntimeEnvForTests()` to per-test `afterEach`.
- R4-8: decide on the `auth_menus` compound index (`{type:1,ou_id:1}`) vs the `auth_users` index actually added (`by_ou_role`), and update `_mission-control/tasks/todo.md` Phase A statuses to reflect real completion.
- R4-9: add `StaffTable.test.tsx` (no `onEdit` → no Edit button) and `StaffManagement.test.tsx` (mock `usePermission` with/without `profiles:create`/`profiles:edit` → Create/Edit visibility) — the production code to test against now exists and is correct.
- R4-10 remainder: make `genCheck.problem` fallback in `admin.route.js` more robust (currently hardcoded since `unauthorizedServiceOutcome()` never sets `.problem`); resolve `deleteMenu`'s 3×409-with-`AUTH_INVALID_REQUEST`@400 mismatch (consider new `AUTH_MENU_IN_USE`@409); add "fails with 403 without permission" tests for Restore/Reset-Password/Update-Role.
- `AdminLayout.test.tsx`'s `act()` warning regression (4→6) from the new `openKeys`-sync `useEffect` — worth a quick look alongside the broader `act()` cleanup.

---

## Verification results

| Area                    | Tests                                                                                                  | Lint                                                   | Format              | Build/Spec                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------- |
| `backend/auth`          | `npm test` → **134/134 pass**                                                                          | `npm run lint` ❌ **FAIL — 2 errors** (NEW-CRITICAL-1) | `format:check` pass | `spec:lint` pass, `spec:codes` pass, `audit:check` pass; **`npm run ci` FAILS** (stops at lint) |
| `backend/service/staff` | unit **134/134 pass**; full `npm test` (MongoDB reachable) → **194/200 pass, 6 fail** (NEW-CRITICAL-2) | `npm run lint` pass                                    | `format:check` pass | `spec:lint` pass ×2 (openapi.yaml + openapi-via-gateway.yaml)                                   |
| `frontend/backoffice`   | `npx vitest run` → **79/79 pass** (AuthContext act() warnings 5×, AdminLayout act() warnings **4→6**)  | `npx eslint .` → **0 errors**                          | —                   | `npx tsc -b` pass; `npm run build` pass                                                         |

---

## Recommended Round 5 fix order

1. **[NEW-CRITICAL-1]** Delete unused `ObjectId` import (`admin.route.js:4`) and unused `menus` fixture (`test/seed-permissions.test.js:131-136`) — unblocks `npm run ci`. (2-line fix)
2. **[NEW-CRITICAL-2]** Fix the 6 failing staff integration tests — items #1 (etag-first fix for `profiles.lifecycle.test.js:239`), #2-4 (`payload: {}` for archive/restore POSTs), #5 (fix `/reset-password`→`/password` URL) are all mechanical. Item #6 (Update Role 503) needs an environment decision (mock `auth-internal` or document as integration-only).
3. R4-9: add `StaffTable.test.tsx`/`StaffManagement.test.tsx` against the now-correct production permission-gating code.
4. R4-7: `request.log` threading + `env.test.js` PERMISSION_MODE test + `resetRuntimeEnvForTests()` per-test.
5. R4-10 remainder: `genCheck.problem` fallback robustness, `deleteMenu` 409/code mismatch, 403-tests for Restore/Reset-Password/Update-Role.
6. R4-6 remainder: cycle/depth-guard test, `act()` warning cleanup (now slightly worse for `AdminLayout.test.tsx`).
7. R4-8: `auth_menus` index decision + `tasks/todo.md` status sync.

ดู checklist แบบ checkbox ที่ [`review-4-todo.md`](./review-4-todo.md)
