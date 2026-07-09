# ADR 004 — Drop legacy `x` collection on prod

| Field | Value |
|-------|-------|
| **Status** | Accepted (executed 2026-07-09) |
| **Date** | 2026-07-09 |
| **Scope** | `zero-smart-report.x` |

## Context

Prod `zero-smart-report` had a collection named `x` with no ERD entry, no `init-db` reference, and no application code import. Treated as orphan/legacy from early development or manual Compass experiment.

## Decision

1. **Drop** collection `x` from production.
2. **Do not** recreate in any environment bootstrap.
3. If a similarly named collection appears again, treat as incident — investigate before keeping.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Rename / migrate | No documented schema or consumers |
| Document as ADR-retained | No business purpose identified |

## Consequences

- Prod handoff: dropped 2026-07-09 alongside fixture collections ([ADR 003](./003-remove-smart-report-fixture-collections-from-prod.md)).
