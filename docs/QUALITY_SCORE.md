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
| backoffice | B+ | yes | partial | no | Naming conventions applied; no central product spec |

## Gaps to close (priority)

1. **P2** — branch-report harness seed for `gpp_777ww` (functional API smoke beyond healthz)
2. **P3** — Add product spec index entry for backoffice under `docs/specs/`
3. **P3** — `spec:consistency` ongoing — integration tests when touching contracts (`TD-001` mitigated)

## Last updated

2026-07-06 — Tech debt cleanup (TD-001–TD-008).
