# Quality score

Domain health grades for harness engineering. Updated by `/gc` and after major changes.

**Rubric:** A = production-ready, spec synced, CI green, observability wired · B = functional, minor gaps · C = known drift · D = blocking issues · F = not bootstrapped

| Domain | Grade | CI | Spec | Observability | Notes |
|--------|:-----:|:--:|:----:|:-------------:|-------|
| auth | A- | yes | yes | yes | ESLint harness `error`; metrics + JSON logs in harness dev |
| gateway | A- | yes | yes | yes | ESLint harness `error`; metrics wired |
| staff | A | yes | yes | yes | Reference service; profiles split; prom default metrics |
| agent-invoice | B+ | yes | yes | yes | Booted in dev-up; `/metrics` wired; `config/logger.js` aligned (CS-10) |
| smart-report | A- | yes | yes | yes | Full OpenAPI CRUD + via-gateway; sandbox adversarial integration tests |
| branch-report | B+ | yes | yes | yes | Local `gpp_777ww` seed path + `verify-branch-report-seed.sh` |
| demo-service | B | yes | yes | partial | Central spec index; scraped in observability; sample service only |
| backoffice-next | A- | yes | yes | no | Legacy `frontend/backoffice` (Vite) removed 2026-07-08; Biome lint 0 errors; SmartReport server pagination; invoice URL sync; review fixes shipped |

## Gaps to close (priority)

1. **P2** — Staging UAT sign-off for backoffice-next cutover (`frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md`)
2. **P3** — SmartReport server-side search when API supports `search` param (client search disabled)

## Last updated

2026-07-09 — Post-residual Phases 1–4: smart-report OpenAPI CRUD + via-gateway (A-), branch-report local seed verify (B+), demo-service spec index, agent-invoice logger. Prior: Legacy `frontend/backoffice` (Vite) removed; harness/CI/docs updated to `backoffice-next` only.
