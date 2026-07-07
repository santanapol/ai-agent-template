---
status: completed
created: 2026-07-07
updated: 2026-07-07
completed: 2026-07-07
services: [auth, gateway, staff, demo-service, agent-invoice, smart-report, branch-report, backoffice]
---

# Plan: Full-stack quality pass (test → review → simplify)

## CI status (final)

| Package | Status |
|---------|--------|
| auth | pass |
| gateway | pass |
| staff | pass |
| demo-service | pass |
| agent-invoice | pass |
| smart-report | pass |
| branch-report | pass |
| backoffice | pass |
| `ci-all --with-frontend` | pass |

## Integration

- [x] `GET /auth/me/branches` via auth + gateway (curl)
- [x] Branch switcher covered by `AdminLayout.branchSwitcher.test.tsx` + `AuthContext` tests

## Fixes applied (review → simplify)

### auth
- Moved `ZERO_HQ_BRANCH_ID` to `src/config/platform-branches.js` (C1)
- Prettier `platform-branch.repository.js`, `zero-hq.js`
- `findByOuId` projection; `user_id?.toHexString?.()` guard
- `require-access-bearer` logs JWT verification failures

### backoffice
- `switchBranch` on `AUTH_NOT_READY`: refresh then **retry** `switchActiveBranch` (C2)
- `branchOptions.test.ts` syncs with `platform-branches.js`

### agent-invoice
- `database-invoice.js`: redacted connect errors, ping timeout
- `app.js`: `GATEWAY_SHARED_SECRET` only (no `GATEWAY_SECRET` fallback)
- Prettier mesh-headers / app.js

### smart-report
- Block `$out` / `$merge` aggregation stages in script validator + unit test

### branch-report
- Clearer missing-env error message

### scripts
- `dev-up.sh` comment for idempotent `init-db.mjs`

## Review findings deferred (tech debt / out of scope)

| Package | Item | Severity |
|---------|------|----------|
| gateway | `isPublic: true` on `/auth` prefix — document or narrow | Important |
| branch-report vs staff | Divergent gateway-auth plugins | Important |
| smart-report | vm sandbox trust model (admin-only) | Critical (documented) |
| demo-service | Production secret guard like staff | Important |
| AdminLayout | Extract `useBranchSwitcher` hook (437 lines) | Suggestion |

## Simplify log

| Package | Change |
|---------|--------|
| auth | platform-branches config extraction |
| backoffice | AUTH_NOT_READY retry path |
| agent-invoice | DB connect hardening |
| smart-report | pipeline write stage guard |
| scripts | init-db comment |
