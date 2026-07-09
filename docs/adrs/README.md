# Architecture Decision Records (platform)

Cross-cutting decisions for **zero-platform** — not service-specific stack choices (those live under `backend/*/docs/adrs/`).

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-production-schema-sot-and-handoff.md) | Production MongoDB schema as SoT + handoff policy | Accepted |
| [002](./002-drop-legacy-agents-indexes-on-prod.md) | Drop legacy `agents` indexes on prod | Accepted (executed 2026-07-09) |
| [003](./003-remove-smart-report-fixture-collections-from-prod.md) | Remove smart-report test fixture collections from prod | Accepted (executed 2026-07-09) |
| [004](./004-drop-legacy-smart-report-x-collection.md) | Drop legacy `x` collection on prod | Accepted (executed 2026-07-09) |
| [005](./005-mongodb-collection-validators-policy.md) | MongoDB `$jsonSchema` validators — selective rollout | Accepted (executed 2026-07-09; harness gates wired) |

**Related (not ADRs):** execution log [`db-schema-sync`](../exec-plans/completed/db-schema-sync-2026-07-09.md), validator closure [`collection-validators-rollout`](../exec-plans/completed/collection-validators-rollout-2026-07-09.md), drift matrix [`prod-repo-drift`](../audit/prod-repo-drift-2026-07-09.md), ops handoffs [`docs/ops/`](../ops/).
