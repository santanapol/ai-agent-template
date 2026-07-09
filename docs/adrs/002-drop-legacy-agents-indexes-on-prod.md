# ADR 002 — Drop legacy `agents` indexes on prod

| Field | Value |
|-------|-------|
| **Status** | Accepted (executed 2026-07-09) |
| **Date** | 2026-07-09 |
| **Scope** | `zero-agent-invoice.agents` |

## Context

Prod had two non-unique indexes not declared in normative ERD or `init-db.mjs`:

- `ou_id_1` — `{ ou_id: 1 }`
- `parent_branch_id_1` — `{ parent_branch_id: 1 }`

Package `erd.md` listed them as optional hierarchy/list helpers; prod baseline post-audit showed only `agents_uniq_ou_branch` (`{ ou_id: 1, branch_id: 1 }` unique) is required. Application code queries by `(ou_id, branch_id)` compound, not these legacy singles.

## Decision

1. **Do not** add `ou_id_1` or `parent_branch_id_1` to `init-db.mjs` or `docs/specs/backend/agent-invoice/database-erd.md`.
2. **Drop** both indexes on production (human handoff).
3. **Normative index set** for `agents`: only `agents_uniq_ou_branch` unless a future ADR adds list indexes with query evidence.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| `prod-wins` — add indexes to repo | No application query path documented; duplicates OU scoping already on compound index |
| Keep on prod indefinitely | Perpetuates drift; `verify-indexes` fails |

## Consequences

- Prod handoff: dropped 2026-07-09 — see [`prod-schema-handoff-2026-07-09.md`](../ops/prod-schema-handoff-2026-07-09.md).
- If hierarchy list-by-`parent_branch_id` becomes hot path, open new ADR with query proof before adding index.
