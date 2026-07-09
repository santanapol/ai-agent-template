# ADR 003 — Remove smart-report test fixture collections from prod

| Field | Value |
|-------|-------|
| **Status** | Accepted (executed 2026-07-09) |
| **Date** | 2026-07-09 |
| **Scope** | `zero-smart-report` |

## Context

Production contained collections used only by integration/sandbox tests:

| Collection | Purpose |
|------------|---------|
| `sandbox_runner_fixture` | Sandbox runner integration tests |
| `scheduler_fixture` | Scheduler integration tests |
| `validate_test_run_fixture` | Script validator integration tests |

They are not in product ERD, not seeded for staging/prod, and not referenced by runtime API paths.

## Decision

1. **Drop** all three collections from production (human handoff).
2. **Do not** add them to `init-db.mjs`, staging seed, or normative ERD.
3. Tests continue to create fixtures in harness / CI databases (`zero-smart-report_0` or ephemeral test DB).

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Keep on prod for debugging | Pollutes prod schema; violates least-surprise for ops |
| Move to separate test database on prod cluster | Unnecessary cost; harness already covers |

## Consequences

- Prod handoff: dropped 2026-07-09.
- `verify-indexes` and prod baseline expect only `reports` + `download_history` (+ `_id_` defaults).
