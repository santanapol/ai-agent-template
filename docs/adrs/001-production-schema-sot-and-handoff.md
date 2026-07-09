# ADR 001 — Production MongoDB schema as SoT + handoff policy

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-09 |
| **Scope** | `zero-platform`, `zero-agent-invoice`, `zero-smart-report` write databases |

## Context

Repo ERD and `init-db.mjs` had drifted from production. Harness snapshots were stale. Agents must not mutate production data during discovery.

## Decision

1. **Production write MongoDB is schema SoT** until reconciled and recorded in `docs/audit/prod-schema-baseline-*.json`.
2. **Workflow gate:** read-only prod dump → drift matrix → repo sync → optional prod handoff → re-dump → verify.
3. **Verdicts** for every delta: `prod-wins` (update repo), `repo-wins` (human handoff to prod), or **`ADR`** (ambiguous / destructive — document before acting).
4. **Agent automation:** read-only on prod (`listCollections`, `indexes`, validator options). **Human** runs writes (Compass, `collMod`, `dropIndex`, `dropDatabase`).
5. **Bootstrap target:** `init-db` + ERD should match prod baseline after sync; harness `verify-indexes` and `verify-validators` compare live DB to baseline JSON and registry modules.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Repo ERD as SoT without prod dump | Prod had indexes/collections repo did not document |
| Agent applies prod fixes directly | Violates ops policy; no audit trail for human |
| Auto `prod-wins` on suspicious legacy indexes | Risk of keeping wrong indexes — use ADR + human |

## Consequences

- Baseline files under `docs/audit/` are machine/human SoT after PR-0a.
- Destructive prod changes require ADR + handoff doc + human execution.
- See [`db-schema-sync-2026-07-09`](../exec-plans/completed/db-schema-sync-2026-07-09.md).
