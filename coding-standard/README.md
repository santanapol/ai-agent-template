# coding-standard (vendored in zero-platform)

Copy of the organization **coding-standard** tree, bundled inside `zero-platform` so CI, Spectral, and `spec:codes` validators work on a clean checkout without sibling-repo paths.

**Source of truth:** edit standards in the org `coding-standard` repository (or `coding-standard/` at agent-skill workspace root), then sync changed files into this directory.

## Layout

| Path | Consumers |
|------|-----------|
| `auth/spectral/org-api.yaml`, `auth/codes.yaml` | `backend/auth/.spectral.yaml`, `spec:codes` |
| `gateway/spectral/org-api.yaml`, `gateway/codes.yaml` | `backend/gateway/.spectral.yaml`, `spec:codes` |
| `backend/spectral/org-api.yaml` | `backend/service/*/.spectral.yaml` |
| `backend/*.md`, `auth/*.md` | Spec markdown links under `docs/specs/` |
| `frontend/backoffice/` | Backoffice UI standards (`01–10`) + `live-demo-shadcn` scaffold |
| `naming-conventions.md` | File and folder naming rules (all zones) |

## Sync from upstream

1. Diff upstream `coding-standard/` against this directory.
2. Copy changed files (preserve relative paths).
3. Run gates in affected packages:
   - `npm run spec:lint` and `npm run spec:codes` in `backend/auth`, `backend/gateway`
   - `npm run spec:lint` in each `backend/service/*` that extends `backend/spectral/org-api.yaml`
4. Open a PR; CI matrix exercises all affected services.

**Do not** point `.spectral.yaml` outside this repo — that breaks clean CI checkouts.

## Spectral CLI pin

`backend/auth` runs `bootstrap:spectral` (`@stoplight/spectral-cli@6.15.1`) before `spec:lint` because hoisted Spectral 6.16.x crashes on auth `openapi.yaml`. Keep that pin when upgrading Spectral workspace-wide.
