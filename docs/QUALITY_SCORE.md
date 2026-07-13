# Quality score

Domain health grades for harness engineering. Updated by `/gc` and after major changes.

**Rubric:** A = production-ready, spec synced, CI green, observability wired · B = functional, minor gaps · C = known drift · D = blocking issues · F = not bootstrapped

| Domain | Grade | CI | Spec | Observability | Notes |
|--------|:-----:|:--:|:----:|:-------------:|-------|
| auth | A- | yes | yes | yes | Collection validators + `verify-harness-schema` gate; `spec:consistency` checks validators |
| gateway | A- | yes | yes | yes | ESLint harness `error`; metrics wired; PM2 memory caps tuned for 2GB staging (`db71e0d`) |
| staff | A | yes | yes | yes | Reference service; profiles split; prom default metrics |
| agent-invoice | B+ | yes | yes | yes | Booted in dev-up; `/metrics` wired; `config/logger.js` aligned (CS-10) |
| smart-report | A- | yes | yes | yes | Full OpenAPI CRUD + via-gateway; sandbox adversarial integration tests |
| branch-report | B+ | yes | yes | yes | Local `gpp_777ww` seed path + `verify-branch-report-seed.sh` |
| demo-service | B | yes | yes | partial | Central spec index; scraped in observability; sample service only |
| backoffice-next | A- | yes | yes | no | Legacy `frontend/backoffice` (Vite) removed 2026-07-08; Biome lint 0 errors; SmartReport server pagination; invoice URL sync; review fixes shipped |

## Gaps to close (priority)

1. **P2** — Human ops: TD-027 index apply staging/prod; TD-018 orphan fee cleanup ([ops docs](ops/))
2. **P2** — Staging UAT sign-off for backoffice-next cutover (`frontend/backoffice-next/docs/STAGING-UAT-2026-07-08.md`)
3. **P3** — SmartReport server-side search when API supports `search` param (client search disabled)

## Last updated

2026-07-13 — `/gc` after v0.7.0 deploy + tag (`db71e0d`): PM2 memory cap fix (TD-036 closed), release deploy note synced. Prior: collection validators rollout (2026-07-09).
