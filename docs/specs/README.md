# Product specs

Durable **what to build** documents for this repo. Written by `/spec` (or manually); read by `/plan`, `/build`, and review phases.

## Convention

| Scope | Path |
|-------|------|
| Feature / product spec (default) | `docs/specs/<slug>.md` |
| Single service under configured code zone (optional) | `<code.backend\|frontend>/<service>/docs/spec.md` — see `harness.config.yaml` |

**Slug:** kebab-case (e.g. `deposit-matrix`, `auth-branch-pagination`).

## Not allowed

Do **not** commit specs at repo root or ephemeral paths:

- `SPEC.md` (root)
- `docs/SPEC.md`
- `spec/` (root)
- `tasks/`
- `_mission-control/`

Exec plans live in [`../exec-plans/`](../exec-plans/README.md), not here.
