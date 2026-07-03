# coding-standard (vendored)

Subset of the organization **coding-standard** monorepo, copied into `zero-platform` so CI and local `spec:lint` / problem-code validators work on a clean checkout without sibling-repo paths.

Introduced in [#49](https://github.com/Chiang-Rai-Technology/zero-platform/pull/49) to fix GHA failures where `.spectral.yaml` extended rulesets outside the repository.

## Layout

| Path | Consumers |
|------|-----------|
| `gateway/spectral/org-api.yaml` | `backend/gateway/.spectral.yaml` |
| `gateway/codes.yaml` | `backend/gateway/scripts/validate-gateway-openapi-problem-codes.mjs` |
| `auth/spectral/org-api.yaml` | `backend/auth/.spectral.yaml` |
| `auth/codes.yaml` | `backend/auth/scripts/validate-auth-openapi-problem-codes.mjs` |
| `auth/5-security-and-validation.md` | Auth spec markdown links |
| `backend/spectral/org-api.yaml` | `backend/service/*/.spectral.yaml` (agent-invoice, staff, smart-report, branch-report, demo-service) |
| `backend/spectral/functions/trustedHeaderOrder.js` | Backend spectral ruleset |
| `backend/*.md` | Service spec markdown links (headers, response codes, OpenAPI contract, DB) |

## Sync from upstream

When the canonical coding-standard repo changes rules or problem codes:

1. Diff the upstream paths listed above against this directory.
2. Copy changed files into the matching paths here (preserve relative structure).
3. Run per-package gates:
   - `npm run spec:lint` and `npm run spec:codes` in `backend/gateway` and `backend/auth`
   - `npm run spec:lint` in each `backend/service/*` that extends `backend/spectral/org-api.yaml`
4. Open a PR; CI matrix exercises all affected services.

**Do not** point `.spectral.yaml` back to `../../../../coding-standard` outside this repo — that breaks clean CI checkouts.

## Spectral CLI pin

`backend/auth` prepends `bootstrap:spectral` (`@stoplight/spectral-cli@6.15.1`) before `spec:lint` in `npm run ci` because hoisted Spectral 6.16.x crashes on auth `openapi.yaml`. Keep that pin when upgrading Spectral workspace-wide.

## Ownership

Treat this tree as **downstream mirror**, not the source of truth. Authoritative edits belong in the organization coding-standard repository; vendored copies follow via deliberate sync PRs.
