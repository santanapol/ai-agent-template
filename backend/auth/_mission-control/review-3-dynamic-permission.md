# Code Review #3 (Verification) — Dynamic Permission Rollout (Phase 1–5)

**Date:** 2026-06-15
**Scope:** verify fixes applied per [`review-2-todo.md`](./review-2-todo.md) — **uncommitted working-tree changes** vs baseline `692882f` (now 31 files, +667/−161, up from 27 files/+445/−53 in Round 2)
**Method:** `/review` Round 3 — 3 parallel verification agents (auth / staff / frontend), each verifying assigned R3 tasks + fresh 5-axis pass on the delta since Round 2
**Verdict:** ⚠️ **Request Changes (smaller scope than Round 1/2)** — both Round-2 Critical production bugs are now **genuinely fixed in production code**, but the test suite gained **3 new broken integration tests** (would fail once run against real MongoDB) and is **missing 4 explicitly-requested regression tests**

---

## TL;DR — progress vs Round 2

✅ **Both Round-2 Criticals are now correctly fixed in production code:**

- **CRITICAL-1** (archive/restore wrong `actionKey`) → `profiles.service.js:859,910` now use `"profiles:edit"`, matching SPEC/openapi. Verified correct by static trace.
- **CRITICAL-2** (`revoke_sessions` self-stale no-op) → `admin.route.js` now captures `genCheck = await assertAccessTokenGenMatches(...)`, returns 401 if `!genCheck.ok`, reuses `genCheck.user`. Verified correct by code read.

✅ **The Round-2 eslint regression (0→2 errors) is fully resolved** — `npx eslint .` in `frontend/backoffice` is back to 0 errors, `tsc -b`/`npm run build` still pass.

✅ **R3-4, R3-5 (code/status), R3-6, R3-7 (both services)** all done correctly — `coding-standard/auth/codes.yaml` now has all 5 needed codes (incl. new `AUTH_ROLE_PERMISSION_IN_USE`@409), `spec:codes` passes, `deleteRolePermission` ordering fixed, staff `PATCH /profiles/{id}/role` openapi now matches the real `204` handler + role enum, and `format:check` passes in both `backend/auth` and `backend/service/staff`.

❌ **But the 182-line integration-test addition in `profiles.permissions.test.js` has 3 new bugs that will fail once run against real MongoDB:**

- Archive's "fails with 403" test will actually get **412** (a side-effect of removing `assertAdminRole` changed execution order — `parseIfMatchHeader` now runs first and throws on the test's bogus `if-match` value before the permission check executes).
- Reset Password's "succeeds" test sends `new_password` (schema requires `password`) AND asserts `200` (handler returns `204`) — double bug.
- Update Role's "succeeds" test asserts `200` (handler returns `204`).

❌ **R3-2 and R3-5's explicitly-requested new integration tests were NOT added** — both test-file diffs in `backend/auth/test/admin.integration.test.js` (+93/−25) are **100% prettier reformatting**, no new test cases. The two highest-value regression tests from this entire review cycle (self-revoke→401, delete-blocked-409/confirm-then-204) remain unverified by the suite.

⚠️ Several Suggestion-tier items (R3-8 escalating-action allow-list, R3-9 a/b/c frontend menu/test cleanup, R3-10 a/c staff logging/test-cleanup, R3-11 a/b index/docs, R3-12 a/b new test files) were marked `[x]` in `review-2-todo.md` but **not actually done** — same pattern as Round 1→2.

---

## Per-task verification table

| #      | Task                                                                 | Severity   | Status                                          | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------- | ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R3-1   | [Staff] archive/restore `actionKey` → `profiles:edit`                | Critical   | ✅ **Done correctly**                           | `profiles.service.js:859,910` now pass `"profiles:edit"`. `assertAdminRole` removal verified clean — auth decision now solely via `assertAdminLifecycleAccess`/`assertProfileScope`. But see [IMPORTANT-1](#important-findings-new).                                                                                                                                                                                                                              |
| R3-2   | [Auth] `revoke_sessions` self-stale → 401                            | Critical   | ⚠️ **Partial — code fixed, test missing**       | `admin.route.js` correctly captures `genCheck`, returns 401 on `!genCheck.ok`, reuses `genCheck.user`. **No new integration test added** (diff is prettier-only).                                                                                                                                                                                                                                                                                                 |
| R3-3   | [Frontend] fix 2 new eslint errors (0→2→?)                           | Important  | ✅ **Done, with caveat**                        | `npx eslint .` → 0 errors. `AuthContext.tsx:107` fixed via justified `eslint-disable` comment ✅. `AdminLayout.tsx:215` fixed via `as unknown as AntdMenuItem[]` — passes the literal `no-explicit-any` rule but is the same type-erasure pattern as `as any` (see [IMPORTANT-2](#important-findings-new)). Also added an unused `disabled?: boolean` field to `MenuItemType` (dead code).                                                                        |
| R3-4   | [Auth] register missing codes in `codes.yaml`                        | Important  | ✅ **Done correctly**                           | All 4 codes + new `AUTH_ROLE_PERMISSION_IN_USE`@409 added. `npm run spec:codes` passes.                                                                                                                                                                                                                                                                                                                                                                           |
| R3-5   | [Auth] `deleteRolePermission` ordering + code/status                 | Important  | ⚠️ **Partial — code fixed, tests/docs missing** | Ordering now: `ouId≠null` 400 → 404 → `platform_admin` lockout 400 → active-users 409 (last) ✅. New `AUTH_ROLE_PERMISSION_IN_USE`@409 used correctly ✅. `confirm` query param wired through validator/route/controller/repository ✅. **No new integration tests** (409-blocked, 204-with-confirm) — diff is prettier-only. `openapi.yaml`'s `DELETE .../role-permissions/{ou_id}/{role}` still undocumented beyond `204` (no `confirm` param, no 400/404/409). |
| R3-6   | [Staff] openapi `PATCH /profiles/{id}/role` → 204 + role enum        | Important  | ✅ **Done correctly**                           | Response now `204` no body (matches `changeProfileRole`); `role` now `enum: VALID_ROLES`. `spec:lint` passes. Minor: `openapi-via-gateway.yaml` not updated to mirror this new path (Suggestion, see new findings).                                                                                                                                                                                                                                               |
| R3-7   | [Auth + Staff] `format:check` passes                                 | Important  | ✅ **Done**                                     | Both services: "All matched files use Prettier code style!"                                                                                                                                                                                                                                                                                                                                                                                                       |
| R3-8   | [Auth] escalating-action allow-list (replace keyword heuristic)      | Suggestion | ❌ **Not done**                                 | `permission-validation.js:75-88` byte-identical to Round 2 — still `ESCALATING_KEYWORDS=['assign','manage']` substring match, no new test.                                                                                                                                                                                                                                                                                                                        |
| R3-9a  | [Frontend] `AdminLayout.tsx` controlled `openKeys`/`onOpenChange`    | Suggestion | ❌ **Not done**                                 | `key={defaultOpenKeys.join(',')}` unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| R3-9b  | [Frontend] cycle/depth-guard tests for menu-tree builder             | Suggestion | ❌ **Not done**                                 | No new test in `AdminLayout.test.tsx` or `backend/auth`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| R3-9c  | [Frontend] fix `act()` warnings                                      | Suggestion | ❌ **Not done**                                 | Warnings persist in `AdminLayout.test.tsx` (both tests) and `AuthContext.test.tsx` (5x).                                                                                                                                                                                                                                                                                                                                                                          |
| R3-10a | [Staff] `request.log` for fallback-hit log                           | Suggestion | ❌ **Not done**                                 | `assertPermission` signature unchanged; `profiles.service.js:58` still module-level `logger`.                                                                                                                                                                                                                                                                                                                                                                     |
| R3-10b | [Staff] unit test for `PERMISSION_MODE` validation                   | Suggestion | ⚠️ **Partial**                                  | `env.js` validation logic already correct (from earlier round). `env.test.js` has zero diff — no new test added.                                                                                                                                                                                                                                                                                                                                                  |
| R3-10c | [Staff] `resetRuntimeEnvForTests()` cleanup                          | Suggestion | ❌ **Not done**                                 | New `assertPermission` describe block (`profiles.service.unit.test.js:359-394`) calls `setRuntimeEnv(...)` twice, never resets — established pattern in `rbac.test.js` not followed.                                                                                                                                                                                                                                                                              |
| R3-11a | [Auth] index — `{type:1,ou_id:1}` on `auth_menus`                    | Suggestion | ⚠️ **Different index added**                    | Neither `init-db.mjs` nor `ensure-indexes.mjs` added the requested `auth_menus` index. Instead both added `{ou_id:1,role:1}` (`by_ou_role`) on `auth_users` — useful for `countUsersInScope`/R3-5, but not what was asked.                                                                                                                                                                                                                                        |
| R3-11b | [Auth] review `tasks/plan.md`/`todo.md` (Phase A)                    | Suggestion | ⚠️ **Partial**                                  | `plan.md` diff is formatting-only (no status updates). `tasks/todo.md` has **zero diff** — Phase A checkboxes still all unchecked despite the underlying work being done and tested.                                                                                                                                                                                                                                                                              |
| R3-12a | [Frontend] `StaffTable.test.tsx` (no `onEdit` → no Edit button)      | Suggestion | ❌ **Not done**                                 | File doesn't exist.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| R3-12b | [Frontend] `StaffManagement.test.tsx` (permission-gated Create/Edit) | Suggestion | ❌ **Not done**                                 | File doesn't exist.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Important findings (new, this round)

### [IMPORTANT-1] Three new bugs in `profiles.permissions.test.js`'s enforce-mode integration tests

**Source:** delta review of `backend/service/staff/src/modules/profiles/tests/integration-test/profiles.permissions.test.js` (added across Rounds 1-3, still untested against real MongoDB)

1. **Archive "fails with 403 PERMISSION_DENIED without profiles:edit" → will actually return `412`** (lines ~335-352). This test sends `if-match: 'W/"dummy"'`. Removing `assertAdminRole(userContext)` (part of R3-1's correct fix) means `transitionProfileStatus` now calls `parseIfMatchHeader(ifMatchHeader)` (line ~765) as effectively the first step — `decodeIfMatch('W/"dummy"')` doesn't decode to a valid date, so `parseIfMatchHeader` throws `HttpError(412, VERSION_CONFLICT, ...)` **before** the `profiles:edit` permission check ever runs. The test expects 403.
   - **Fix:** either fetch a real, fresh `If-Match` etag first (like other tests do) so 412 doesn't fire and the 403 from the permission check is what's actually observed, OR reorder `transitionProfileStatus` so the permission check runs before `parseIfMatchHeader`.

2. **Reset Password "succeeds with profiles:edit permission" → double bug** (lines ~403-433). Sends `payload: { new_password: "NewPassword123!" }`, but `adminPasswordSchema` (`profiles.schema.js:95-110`, `additionalProperties: false`) requires the field `password` — Fastify schema validation rejects this with `400` before the handler runs. Even with the correct field name, `resetProfilePassword`'s controller returns `204`, but the test asserts `200`.
   - **Fix:** change payload key `new_password` → `password`, and assertion `200` → `204`.

3. **Update Role "succeeds with roles:assign permission" → asserts `200`, handler returns `204`** (lines ~445-475). `changeProfileRole` controller returns `reply.status(204).send()`.
   - **Fix:** change assertion `200` → `204`.

**Why this matters:** these 3 tests are part of the explicitly-requested Task 9b enforce-mode coverage (Round 1) meant to catch exactly the class of bug CRITICAL-1 was. As written, all 3 would **fail** the moment `npm test` runs against a real MongoDB (currently they're silently `cancelled` in this sandbox due to no Mongo) — i.e. merging this as-is would turn CI red.

### [IMPORTANT-2] `AdminLayout.tsx:149` — `as unknown as AntdMenuItem[]` is functionally the same escape hatch as `as any`

Satisfies `@typescript-eslint/no-explicit-any` literally (no occurrence of the word `any`), and `tsc -b` passes, but provides no structural type-checking between `MenuItemType[]` and antd's expected `ItemType[]`. A future shape drift in `MenuItemType` would not be caught by `tsc`.

- **Fix:** implement a small recursive `toAntdMenuItems(items: MenuItemType[]): MenuProps['items']` that rebuilds each node (`children: item.children?.length ? toAntdMenuItems(item.children) : undefined`), with at most one targeted `as MenuProps['items']` cast at the return — confirmed via scratch-compile this avoids the `unknown` bridge entirely.
- Also remove the newly-added, never-read `disabled?: boolean` field from `MenuItemType` (`AdminLayout.tsx:97`) — dead code.

### [IMPORTANT-3] R3-2 and R3-5's explicitly-requested regression tests still missing

`backend/auth/test/admin.integration.test.js` diff (+93/−25) is **100% prettier reformatting of the existing 13 tests** — no new test cases for:

- Self-revoke: platform_admin calls `PUT role-permissions/.../...` with `revoke_sessions: true` affecting their own role → retry with old token → expect 401 (covers CRITICAL-2's fix).
- `DELETE role-permissions/{ou_id}/{role}` with active users and no `confirm=true` → 409 `AUTH_ROLE_PERMISSION_IN_USE`; with `confirm=true` → 204 (covers R3-5's fix).

Both production-code fixes are verified correct by direct code reading, but remain unguarded by tests — a future refactor could silently re-break either without any red CI signal.

### [IMPORTANT-4] `openapi.yaml`'s `DELETE /auth/admin/role-permissions/{ou_id}/{role}` still only documents `204`

R3-5 added a `confirm` query param and 400/404/409 response paths in code, but `openapi.yaml` wasn't updated to document any of them. `spec:lint`/`spec:codes` don't catch per-endpoint completeness gaps.

---

## Suggestions (new, this round)

- `admin.route.js` — `genCheck.problem ?? problemPayload({...types.invalidToken...})` fallback relies on `unauthorizedServiceOutcome` never setting `.problem` and never returning a different `type`; if `assertAccessTokenGenMatches` is later extended, this hardcoded fallback could silently diverge. Consider reusing `sendServiceProblem`/`codeForProblemType`, or have the helper always populate `.problem`.
- `admin.route.js` — `genCheck.user ?? (await authService.repo.findUserById(...))` fallback is dead code (`assertAccessTokenGenMatches` always returns `user` on success); simplify to `const user = genCheck.user`.
- `admin.service.js`'s `deleteMenu` still has 3 branches returning 409 with `code: 'AUTH_INVALID_REQUEST'` (registered @ 400) — same class of mismatch R3-5 just fixed for `deleteRolePermission`, now inconsistent. Consider a new `AUTH_MENU_IN_USE`@409.
- `backend/service/staff/openapi-via-gateway.yaml` doesn't mirror the new `PATCH /profiles/{id}/role` path that R3-6 added to `openapi.yaml` (archive/restore/password sub-resources are mirrored there; `/role` is not).
- Restore/Reset-Password/Update-Role enforce-mode test blocks lack a "fails with 403 without permission" counterpart (Archive has one — which itself has IMPORTANT-1's bug).
- `AdminLayout.tsx` — the new `AntdMenuItem` type alias (and the pre-existing `MenuItemType` interface) are defined inside the component function body between two `useEffect`s — should be hoisted to module scope.

---

## Verification results

| Area                    | Tests                                                                                                                                                                                                                          | Lint                                                                   | Format                          | Build/Spec                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `backend/auth`          | `npm test` → **131/131 pass**                                                                                                                                                                                                  | `npm run lint` **pass**                                                | `npm run format:check` **pass** | `spec:lint` pass, `spec:codes` **pass**, `npm run ci` **pass** |
| `backend/service/staff` | unit **37/37 pass**, `env.test.js` **2/2 pass** (no new PERMISSION_MODE case); full `npm test` **hangs/cancels** (no MongoDB) — static trace of new tests: 2 pass (archive/restore "succeeds"), **3 would fail** (IMPORTANT-1) | `npm run lint` **pass**                                                | `npm run format:check` **pass** | `spec:lint` pass ×2 (openapi.yaml + openapi-via-gateway.yaml)  |
| `frontend/backoffice`   | `npx vitest run` → **79/79 pass** (act() warnings persist in `AdminLayout.test.tsx` ×2, `AuthContext.test.tsx` ×5)                                                                                                             | `npx eslint .` → **0 errors** (regression from Round 2 fully resolved) | —                               | `npx tsc -b` **pass**; `npm run build` **pass**                |

---

## Recommended Round 4 fix order

1. **[IMPORTANT-1]** Fix the 3 new broken integration tests in `profiles.permissions.test.js` (archive-403→412, reset-password field name + status, update-role status) — otherwise `npm test` goes red the moment MongoDB is available in CI.
2. **[IMPORTANT-3]** Add the 2 missing regression tests in `backend/auth/test/admin.integration.test.js`: self-revoke→401 (R3-2), delete-blocked-409/confirm→204 (R3-5).
3. **[IMPORTANT-2]** Replace `AdminLayout.tsx:149`'s `as unknown as AntdMenuItem[]` with a real recursive mapper; remove the unused `disabled` field.
4. **[IMPORTANT-4]** Document `confirm` param + 400/404/409 responses for `DELETE .../role-permissions/{ou_id}/{role}` in `backend/auth/openapi.yaml`.
5. Remaining Suggestion-tier items (R3-8, R3-9a/b/c, R3-10a/c, R3-11a/b, R3-12a/b) — as time allows; note these have now been carried unfinished across 3 rounds despite checkboxes marked done, consider deprioritizing explicitly in `tasks/todo.md`/`tasks/plan.md` if truly low-value, rather than re-promising them each round.

ดู checklist แบบ checkbox ที่ [`review-3-todo.md`](./review-3-todo.md)
