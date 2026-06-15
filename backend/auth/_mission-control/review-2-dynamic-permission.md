# Code Review #2 (Verification) — Dynamic Permission Rollout (Phase 1–5)

**Date:** 2026-06-15
**Scope:** verify fixes applied per [`review-1-todo.md`](./review-1-todo.md) — **uncommitted working-tree changes** vs baseline `692882f` (= HEAD reviewed in Round 1)
**Method:** `/review` Round 2 — 3 parallel verification agents (auth / staff / frontend) + direct check (gateway), each verifying assigned tasks + fresh 5-axis pass on the new diff
**Verdict:** ❌ **Request Changes** — 2 of the 6 original Critical items are **still broken** (despite todo checkboxes marked done), and the fixes introduced **2 new lint-breaking regressions**

---

## TL;DR

`git diff 692882f --stat` shows 27 files changed (+445/−53). All 20 checkboxes in `review-1-todo.md` are checked, but verification found:

- **2 of 6 Critical items from Round 1 are NOT actually fixed** — the code looks like it addresses them, but doesn't:
  - **Task 4** (`revoke_sessions` self-stale) — the new check's result is discarded; it's a no-op. Original bug fully reproduces.
  - **Task 1** (archive/restore permission) — the duplicate check was removed, but the remaining check now uses brand-new action keys (`profiles:archive`/`profiles:restore`) that don't exist anywhere in seed data. A user with only `profiles:edit` (the SPEC-documented requirement) still gets 403 in enforce mode — same symptom as the original bug, different cause.
- **2 new eslint errors** introduced (was 0 on baseline): `AdminLayout.tsx:215` (`as any`) and `AuthContext.tsx:107` (`react-hooks/set-state-in-effect`) — `npx eslint .` now fails in `frontend/backoffice`.
- **Task 6** (active-user check before deleting role-permission mapping) works but is ordered before the existing `platform_admin` self-lockout 400 check, so the more specific 400 gets masked by a generic 409, and introduces a new `code`/`status` mismatch (`AUTH_INVALID_REQUEST` @ 409, registry says 400).
- **Task 5** (escalating-action-vs-wildcard guard) is implemented as a hardcoded substring keyword check (`['assign','manage']`), not the allow-list described in the task — has false positive/negative potential and no test.
- **Task 13** (register missing error codes) only half done — openapi enum updated, but `coding-standard/auth/codes.yaml` was not, so `npm run spec:codes` still fails.
- **Task 18(c)** (staff openapi for `PATCH /profiles/{id}/role`) added a path that doesn't match the real handler (`204` vs documented `200`+body, and `role` enum looser than actual validation).
- **`npm run format:check` still fails** — now across 7 files in `backend/auth` + 2 in `backend/service/staff` (some pre-existing from Round 1, some newly introduced).
- Tasks **2, 7, 8, 9(a), 9(b)\*, 10, 11, 12, 14, 15, 16(a), 17, 18(a), 18(b)** verified ✅ correct (see tables below). \*9(b) is correct staff-side but its new "succeeds with profiles:edit" archive/restore tests will fail once Task-1's regression (above) is fixed — they need re-aligning together.
- Tasks **3** (build fix), **19(a/b/c)**, **16(b/c)**, **18(d)** are either incomplete or done via a workaround that creates new debt.

---

## Per-task verification table

### Critical (Round 1)

| #   | Task                                                                 | Status                              | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Phase 3] archive/restore permission key                             | 🆕 **Looks done, new Critical bug** | Duplicate check removed correctly, but `actionKey` changed to non-existent `profiles:archive`/`profiles:restore` (not in `seed-data/permissions.js`, not in SPEC). `profiles:edit`-only users still 403 in enforce mode → **original bug persists under a new name**. See [CRITICAL-1](#critical-1-archiverestore-still-broken-non-existent-permission-keys).                                                                                                                             |
| 2   | [Phase 1↔5] `permissions:manage` seeded                              | ✅ Done correctly                   | `seed-data/permissions.js` — new action node `permissions:manage` (sort_order 70) added to `seedMenus` and to `platform_admin.menu_keys`. `validateSeedData`/seed tests pass.                                                                                                                                                                                                                                                                                                             |
| 3   | [Phase 4] `npm run build` (tsc) 6 errors                             | 🆕 **Builds, but via type-erasure** | `npx tsc -b` now 0 errors, `npm run build` passes. But `AdminLayout.tsx:215` uses `items={menuItems as any}` instead of fixing the `MenuItemType`/antd `ItemType<MenuItemType>[]` mismatch — `MenuItemType.children` is still `optional`. This trips a **new** `@typescript-eslint/no-explicit-any` eslint error (0→1). The 3 test-file `import type` fixes are correct.                                                                                                                  |
| 4   | [Phase 5] `revoke_sessions` self-stale                               | ❌ **Not done (no-op)**             | `admin.route.js:45-48` calls `assertAccessTokenGenMatches(...)` but discards the result — that function never throws, it returns `{ok, status, ...}` (same pattern as `getMyMenus`, which DOES check `.ok`). The `catch` block can't trigger from a stale token-gen. Calling admin's old JWT keeps working on `/auth/admin/*` until natural TTL expiry. **Identical to original finding.** See [CRITICAL-2](#critical-2-revoke_sessions-self-stale-is-a-no-op).                           |
| 5   | [Phase 5] escalating action vs wildcard domain                       | ⚠️ Partial                          | New rule in `validateSeedData` (`permission-validation.js:75-83`), wired into `createMenu`/`updateMenu`/`upsertRolePermission` (not seed-only ✅). But detection = `actionKey.includes('assign'\|'manage')` substring match — false positives (e.g. `*_management_view`) and false negatives (e.g. `users:impersonate`). No unit test added (was explicitly requested).                                                                                                                   |
| 6   | [Phase 5] active-users check before deleting role-permission mapping | ⚠️ Partial, new ordering bug        | `countUsersInScope` wired for all roles, 409 if `confirm≠true` ✅. But check runs **before** the `ouId≠null` 400 and `platform_admin` self-lockout 400 — so `DELETE .../null/platform_admin` without `confirm=true` now returns 409 instead of the more specific 400. New 409 also uses `code: 'AUTH_INVALID_REQUEST'` which is registered @ 400, not 409 (code/status mismatch — the same class of bug Task 13 was meant to fix, reintroduced). No block/confirm-then-delete test added. |

### Important (Round 1)

| #   | Task                                                                  | Status                                                         | Detail                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------ |
| 7   | [Phase 1] optional logger guard                                       | ✅ Done correctly                                              | `auth.service.js:266` → `this.log?.warn?.(...)`.                                                                                                                                                                                                                                                                                     |
| 8   | [Phase 3] validate `PERMISSION_MODE`                                  | ✅ Done correctly                                              | `env.js:59-63` throws `Invalid PERMISSION_MODE: <value>...` for anything outside `["dual","enforce"]`; unset → `"dual"`. Manually verified both branches. No unit test added (minor).                                                                                                                                                |
| 9a  | [Phase 3] fallback-hit log unit test                                  | ✅ Done correctly                                              | New `assertPermission` describe block in `profiles.service.unit.test.js` asserts `logger.warn({action_key, role}, "permission dual-check fallback used")` in dual mode and 403 in enforce mode.                                                                                                                                      |
| 9b  | [Phase 3] enforce-mode coverage (archive/restore/reset-password/role) | 🆕 Added, but 2 tests will fail once Task 1 is fixed correctly | Reset-password and role-change tests align with real action keys (`profiles:edit`, `roles:assign`) ✅. Archive/restore "succeeds with profiles:edit" tests currently pass only because the implementation (incorrectly) checks `profiles:archive`/`profiles:restore` — i.e. **these 2 tests and CRITICAL-1 must be fixed together**. |
| 10  | [Phase 4] permission-gate Staff Create/Edit                           | ✅ Done correctly                                              | `StaffManagement.tsx`: `canCreate = usePermission('profiles:create')` gates Create button; `canEdit = usePermission('profiles:edit')` gates `onEdit` passed to `StaffTable`. `StaffTable.tsx`: `onEdit` optional, Edit button rendered only if present. Deny-by-default confirmed. No dedicated test added (not strictly required).  |
| 11  | [Phase 4] AuthContext integration test                                | ✅ Done correctly                                              | New `AuthContext.test.tsx` covers login → `permissions` stored → `getMyMenus` called → menus populated. Passes (minor `act()` warnings, see new findings).                                                                                                                                                                           |
| 12  | [Phase 5] `types.forbidden` undefined                                 | ✅ Done correctly                                              | `problem.js` `problemTypes()` now returns `forbidden: '${b}/forbidden'`; all 3 sites in `admin.route.js` use it directly (no `                                                                                                                                                                                                       |     | ` fallback). |
| 13  | [Phase 5] register missing error codes                                | ❌ Incomplete                                                  | openapi `Problem.code` enum updated (4 codes) ✅, `admin.service.js` type/code pairing fixed ✅, but **`coding-standard/auth/codes.yaml` not updated** → `npm run spec:codes` **fails** (4 "unknown code" errors). No 4xx Problem examples added to admin paths in openapi.                                                          |
| 14  | [Phase 5] atomic optimistic locking                                   | ✅ Done correctly                                              | `admin.repository.js` `updateMenu`/`deleteMenu` now filter by `{key, upd_date}`, return `matchedCount`/`deletedCount`; service returns 412 on 0 matches.                                                                                                                                                                             |
| 15  | [Phase 5] `{ou_id:1, role:1}` index on `auth_users`                   | ✅ Done correctly                                              | Added to both `scripts/init-db.mjs` and `test/helpers/ensure-indexes.mjs` as `by_ou_role`.                                                                                                                                                                                                                                           |

### Suggestion (Round 1)

| #   | Task                                                                                                                               | Status                   | Detail                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16a | remove unused `MAX_DEPTH`/`MENU_TYPES`                                                                                             | ✅ Done                  | Removed from `seed-permissions.js`.                                                                                                                                                             |
| 16b | compound index `{type:1, ou_id:1}` on `auth_menus`                                                                                 | ❌ Not done              | No such index added.                                                                                                                                                                            |
| 16c | review `tasks/plan.md`/`todo.md` (Phase A)                                                                                         | ❌ Not done              | No changes to those files.                                                                                                                                                                      |
| 17  | [Phase 2] gateway log field                                                                                                        | ✅ Done correctly        | `inject-context.js:43` → `request.log.debug({ claimRejectReason: err?.message }, ...)`, matches `jwt-auth.js` convention exactly.                                                               |
| 18a | staff `assertProfileScope` JSDoc                                                                                                   | ✅ Done                  | `actionKey` documented. Sibling functions (`assertAdminLifecycleAccess`, `transitionProfileStatus`) not updated (minor).                                                                        |
| 18b | staff `permission-match.js` contract comment                                                                                       | ✅ Done                  | Added; staff copy still logic-identical to canonical (only formatting differs, pre-existing).                                                                                                   |
| 18c | staff openapi: document `PATCH /profiles/{id}/role`                                                                                | 🆕 Added, but inaccurate | New path documents `200` + `ProfileEnvelope` + `ETag`, but `profiles.controller.js` returns `204` empty body. `role` schema (`maxLength: 64`, no enum) is looser than real `enum: VALID_ROLES`. |
| 18d | staff: use `request.log` for fallback-hit log                                                                                      | ❌ Not done              | `profiles.service.js:58` still uses module-level `logger`. Checkbox marked done despite no change.                                                                                              |
| 19a | frontend `AdminLayout.tsx` controlled `openKeys`                                                                                   | ❌ Not done              | `key={defaultOpenKeys.join(',')}` unchanged.                                                                                                                                                    |
| 19b | frontend menu-tree cycle/depth-guard tests                                                                                         | ❌ Not done              | No new test cases.                                                                                                                                                                              |
| 19c | fix `act()` warnings in `AdminLayout.test.tsx`                                                                                     | ❌ Not done              | Only import-type changes; warnings persist.                                                                                                                                                     |
| 19d | `AuthContext.tsx` remove `Promise.resolve().then()`                                                                                | 🆕 Done, new lint error  | `setMenuLoading(true)`/`setMenuError(false)` now synchronous in effect body → new `react-hooks/set-state-in-effect` eslint error.                                                               |
| 20  | [Phase 5] housekeeping (prettier, rate limit, openapi schemas, self-lockout simplification, GET role-permissions ou_id validation) | ❌ Not done              | `format:check` still fails (now on more files, see verification table). None of the other sub-items addressed — acceptable to defer, but flagging since checkbox is marked done.                |

---

## Critical findings (new / still open)

### [CRITICAL-1] Archive/restore still broken — non-existent permission keys

**Source:** Round 2 verification of Task 1
**File:** `backend/service/staff/src/modules/profiles/profiles.service.js:859` (`archiveProfile`), `:910` (`restoreProfile`)
**ปัญหา:** The Round 1 fix correctly removed the duplicate `assertAdminRole(userContext)` call, but the remaining `assertAdminLifecycleAccess(...)` call now passes `actionKey: "profiles:archive"` / `"profiles:restore"`. These action keys:

- Don't exist in `backend/auth/scripts/seed-data/permissions.js` (only `profiles:list/lookup/read/create/edit`, `roles:assign`, `permissions:manage`, `profiles:*` wildcards).
- Aren't in `backend/service/staff/_mission-control/SPEC.md`'s permission table.
- Aren't in `backend/service/staff/openapi.yaml`'s archive/restore descriptions (still say "Requires permission `profiles:edit`").

In enforce mode, only a role holding `profiles:*` (wildcard) can match `profiles:archive`/`profiles:restore` — a role granted exactly `profiles:edit` (the SPEC-documented and intended requirement, and the literal scenario Task 1 was meant to fix) gets **403**. This is the same user-facing bug as the original Round 1 finding, just triggered by a different mismatched key.

The new "succeeds with profiles:edit permission" integration tests added for Task 9b (archive ~line 310-333, restore ~line 360-385 of `profiles.permissions.test.js`) will **fail** once this is corrected to `profiles:edit` — or conversely, they currently only "pass" (in the sense of matching the buggy implementation) because they were written against the wrong key too. Could not execute via integration test in this sandbox (no MongoDB), confirmed by static trace of `matchesPermission`.

**Fix:** Change `actionKey: "profiles:archive"` → `"profiles:edit"` and `actionKey: "profiles:restore"` → `"profiles:edit"` at `profiles.service.js:859,910` (matching `resetProfilePassword`'s pattern at `:939`). Then re-verify the Task 9b archive/restore tests still assert `200` for a `profiles:edit`-only user (they should, now for the right reason).

_Alternative if `profiles:archive`/`profiles:restore` were an intentional finer-grained model_: that's a scope change beyond Task 1 — would require updating SPEC's permission table, seeding the new keys for the relevant roles in `seed-data/permissions.js`, and updating openapi descriptions. Given Round 1 explicitly said "Requires `profiles:edit`" is correct per SPEC, the simple revert to `profiles:edit` is the right call.

### [CRITICAL-2] `revoke_sessions` self-stale is a no-op

**Source:** Round 2 verification of Task 4
**File:** `backend/auth/src/modules/admin/admin.route.js:45-48` (inside `requirePermissionManage`)
**ปัญหา:** The added line:

```js
await authService.assertAccessTokenGenMatches({
  user_id_hex: userId,
  token_gen_claim: request.accessTokenGen
})
```

calls the function but **discards its return value**. `assertAccessTokenGenMatches` (in `auth.service.js`, same helper `getMyMenus` uses) never `throw`s on mismatch — it returns `{ ok: false, status: 401, ... }`. Because the result isn't checked, a mismatched `token_gen` has **zero effect**: the request proceeds normally. The surrounding `catch (err) { if (err.status === 401) ... }` block can't catch this since nothing throws.

**ผลกระทบ:** After a platform_admin uses `revoke_sessions: true` against their own role (the "urgent revoke" emergency scenario the feature exists for), their own existing JWT continues to authorize `/auth/admin/*` calls until natural `ACCESS_TOKEN_TTL_SECONDS` expiry (default 15 min) — exactly the gap Task 4 was supposed to close.

**Fix:** Capture and branch on the result, mirroring `getMyMenus`:

```js
const genCheck = await authService.assertAccessTokenGenMatches({
  user_id_hex: userId,
  token_gen_claim: request.accessTokenGen
})
if (!genCheck.ok) {
  return reply
    .code(genCheck.status)
    .type('application/problem+json')
    .send(
      genCheck.problem ??
        problemPayload({
          type: types.invalidToken,
          title: 'Unauthorized',
          status: 401,
          detail: 'Access token is no longer valid.',
          code: 'TOKEN_REFRESH_REJECTED'
        })
    )
}
```

Note `genCheck.user` already contains the user doc fetched inside `assertAccessTokenGenMatches` — reuse it to drop the now-redundant `authService.repo.findUserById(...)` call at line 50 (see [IMPORTANT-6](#important-findings-new--incomplete)).

**Proof of concept (manual trace):** `requireAccessBearer` sets `request.accessTokenGen = payload.token_gen` from the JWT. `assertAccessTokenGenMatches({user_id_hex, token_gen_claim})` compares against `auth_users.access_token_gen` and returns `{ok: token_gen_claim === user.access_token_gen, status: 401, ...}` on mismatch — confirmed by reading `auth.service.js` lines ~627-669 and the `getMyMenus` caller at lines ~161-166 which does check `.ok`.

**Test gap:** No new test exercises "PUT role-permissions with `revoke_sessions:true` affecting caller's own role, then retry with old token → expect 401". This is exactly the test that would have caught this no-op.

---

## Important findings (new / incomplete)

1. **[Phase 5] `coding-standard/auth/codes.yaml` not updated → `spec:codes` fails** — `AUTH_FORBIDDEN`(403), `AUTH_MENU_NOT_FOUND`(404), `AUTH_PRECONDITION_FAILED`(412), `AUTH_ROLE_PERMISSION_NOT_FOUND`(404) added to openapi enum but not to `/home/santanapol/Documents/Workspace/Sandbox/agent-skill/coding-standard/auth/codes.yaml`. `npm run spec:codes` → 4 "unknown code" errors.

2. **[Phase 5] `admin.service.js` new 409 (Task 6) uses `code: 'AUTH_INVALID_REQUEST'` registered @ 400** — same class of code/status mismatch Task 13 targeted, reintroduced by Task 6's diff. Either register a dedicated 409 code (e.g. `AUTH_ROLE_PERMISSION_IN_USE`) or reuse an existing 409 code.

3. **[Phase 5] `admin.service.js` `deleteRolePermission` ordering (Task 6)** — `countUsersInScope` check runs before the `ouId≠null` 400 and `platform_admin` self-lockout 400 checks. Move it to be the LAST gate before `repo.deleteRolePermission`, so the more specific 400s still fire first, and so the DB count query doesn't run for inherently-invalid requests.

4. **[Phase 4] `npx eslint .` regresses 0 → 2 errors**:
   - `AdminLayout.tsx:215:31` — `@typescript-eslint/no-explicit-any` from the `as any` cast (Task 3 workaround).
   - `AuthContext.tsx:107:5` — `react-hooks/set-state-in-effect` from Task 19d's otherwise-correct removal of the `Promise.resolve().then()` wrapper.
     If `npm run lint` is a CI/merge gate (it is, per the `npm run ci` chain noted in Round 1), **this diff currently fails CI** despite `tsc -b`/`vitest`/`build` all passing.

5. **[Phase 5] staff openapi `PATCH /profiles/{profileId}/role` (Task 18c) doesn't match handler** — documents `200` + `ProfileEnvelope` + `ETag`, but `profiles.controller.js` returns `204` empty body; `role` schema lacks the real `enum: VALID_ROLES` (`platform_admin/branch_admin/staff/support`).

6. **[Phase 5] `admin.route.js:50` — redundant `findUserById` once CRITICAL-2 is fixed** — `genCheck.user` from `assertAccessTokenGenMatches` already has the user doc; reuse it instead of a second Mongo round-trip per Admin API call.

7. **`npm run format:check` still fails, scope grew**:
   - `backend/auth`: `scripts/seed-data/permissions.js`, `src/lib/permission-validation.js`, `src/modules/admin/admin.repository.js`, `src/modules/admin/admin.route.js`, `src/modules/admin/admin.service.js` (new, from this diff) + `admin.controller.js`, `test/admin.integration.test.js`, 4 markdown docs (pre-existing from Round 1).
   - `backend/service/staff`: `tests/integration-test/profiles.permissions.test.js`, `tests/unit-test/profiles.service.unit.test.js` (new, from this diff).
     `npm run ci` (= `lint && format:check && test && audit:check`) fails at `format:check` in both `backend/auth` and `backend/service/staff` before `test` even runs.

8. **No new tests for Tasks 4, 5, 6, 16b** despite Round 1 explicitly requesting them — directly correlates with CRITICAL-2 (Task 4) shipping as a no-op undetected by a green suite.

---

## Suggestions (new)

- `permission-validation.js:77` — `ESCALATING_KEYWORDS = ['assign','manage']` substring match is fragile (false positive on e.g. `*_management_view`, false negative on e.g. `users:impersonate`). Prefer an explicit per-action `escalating: true` flag in `seedMenus` or a documented list.
- `admin.validator.js` `confirm` query param (Task 6) and the new 400/404/409/412 responses for `DELETE /auth/admin/role-permissions/{ou_id}/{role}` are undocumented in openapi.
- `AuthContext.test.tsx` and `AdminLayout.test.tsx` both emit "not wrapped in act(...)" warnings — same root cause, worth a shared fix (e.g. `globalThis.IS_REACT_ACT_ENVIRONMENT = true` in `setupTests.ts`, or consistent `await screen.findBy...`).
- `profiles.service.unit.test.js` new `assertPermission` tests call `setRuntimeEnv(...)` without restoring via `resetRuntimeEnvForTests()` — low risk under per-file isolation but should be cleaned up.
- `env.js` `PERMISSION_MODE` validation (Task 8) has no dedicated unit test in `env.test.js`.
- `StaffTable.tsx`/`StaffManagement.tsx` permission-gating (Task 10, the security-relevant UI change) has zero direct test coverage.

---

## Verification results

| Area                    | Tests                                                                                                                                                                                                            | Lint                                        | Format                                    | Build/Spec                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `backend/auth`          | `npm test` → **131/131 pass** (incl. 12/12 admin integration)                                                                                                                                                    | `npm run lint` **pass**                     | `npm run format:check` **FAIL** (7 files) | `spec:lint` pass; **`spec:codes` FAIL** (4 unknown codes)  |
| `backend/gateway`       | not re-run (1-line change, low risk)                                                                                                                                                                             | —                                           | —                                         | —                                                          |
| `backend/service/staff` | unit **35/35 pass**; full suite **143 pass / 1 fail / 56 cancelled** — all failures/cancellations are `ECONNREFUSED 127.0.0.1:27017` (no MongoDB in sandbox); **new archive/restore enforce tests not executed** | `npm run lint` **pass**                     | `npm run format:check` **FAIL** (2 files) | `spec:lint` pass for both openapi files                    |
| `frontend/backoffice`   | `npx vitest run` → **79/79 pass** (13 files; `act()` warnings in 2 files)                                                                                                                                        | `npx eslint .` → **FAIL, 2 errors (was 0)** | —                                         | `npx tsc -b` **pass (0 errors)**; `npm run build` **pass** |

---

## Recommended Round 3 fix order

1. **[CRITICAL-1]** `profiles.service.js:859,910` — fix `actionKey` to `"profiles:edit"` for archive/restore; re-check the two Task-9b archive/restore enforce tests still pass for the right reason.
2. **[CRITICAL-2]** `admin.route.js:45-48` — branch on `assertAccessTokenGenMatches` result (return 401 if `!ok`); add the self-revoke→401 integration test; reuse `genCheck.user` to drop the redundant `findUserById`.
3. **[Important #4]** Fix the 2 new eslint errors: replace `items={menuItems as any}` (`AdminLayout.tsx:215`) with a correct type for `menuItems`; resolve `react-hooks/set-state-in-effect` at `AuthContext.tsx:107` (eslint-disable with justification, or restructure state init).
4. **[Important #1]** Add the 4 missing codes to `coding-standard/auth/codes.yaml`.
5. **[Important #2, #3]** Reorder `deleteRolePermission`'s active-user check to run last, and fix the 409 `code`/`status` pairing.
6. **[Important #5]** Fix staff openapi `PATCH /profiles/{id}/role` (204, role enum).
7. **[Important #7]** `npx prettier --write` on the flagged files in both `backend/auth` and `backend/service/staff`.
8. Remaining: Task 5 allow-list + test, Task 19(a/b/c), 16(b/c), 18(d), Task 20 sub-items — as time allows (Suggestion-tier).

ดู checklist แบบ checkbox ที่ [`review-2-todo.md`](./review-2-todo.md)
