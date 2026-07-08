# Quality score

Domain health grades for harness engineering. Updated by `/gc` and after major changes.

**Rubric:** A = production-ready, spec synced, CI green, observability wired · B = functional, minor gaps · C = known drift · D = blocking issues · F = not bootstrapped

| Domain | Grade | CI | Spec | Observability | Notes |
|--------|:-----:|:--:|:----:|:-------------:|-------|
| auth | A- | yes | yes | yes | ESLint harness `error`; metrics + JSON logs in harness dev |
| gateway | A- | yes | yes | yes | ESLint harness `error`; metrics wired |
| staff | A | yes | yes | yes | Reference service; profiles split; prom default metrics |
| agent-invoice | B+ | yes | yes | yes | Booted in dev-up; `/metrics` wired |
| smart-report | B+ | yes | yes | yes | Booted in dev-up; `/metrics` wired |
| branch-report | B | yes | yes | yes | Booted in dev-up; DB seed for `gpp_777ww` still thin |
| demo-service | B | yes | no | partial | Scraped in observability; sample service only |
| backoffice-next | A- | yes | yes | no | Legacy `frontend/backoffice` (Vite) removed 2026-07-08; Biome lint 0 errors; SmartReport server pagination; invoice URL sync; review fixes shipped |

## Gaps to close (priority)

1. **P2** — Staging UAT sign-off for backoffice-next cutover (`frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md`)
2. **P2** — branch-report harness seed for `gpp_777ww` (functional API smoke beyond healthz)
3. **P3** — SmartReport server-side search when API supports `search` param (client search disabled)

## Last updated

2026-07-08 — Legacy `frontend/backoffice` (Vite) removed; harness/CI/docs updated to `backoffice-next` only (`frontend-checks` GHA job dropped); added `docs/specs/frontend/backoffice-next/backoffice-next-spec.md`. Prior: backoffice-next review fixes (lint gate, invoice URL sync, export bundle, apiError hardening, SmartReport pagination).
