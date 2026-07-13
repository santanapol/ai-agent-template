# ADR 005 — MongoDB `$jsonSchema` collection validators (selective rollout)

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-09 |
| **Scope** | All production write DBs |

## Context

We piloted `$jsonSchema` on `staff_profiles` ([`staff/database-erd.md`](../specs/backend/staff/database-erd.md)). Rolling validators to all collections risks blocking updates on legacy rows (e.g. `agent_fees` with `cr_by: null`). Auth has operational collections intentionally without tenant/audit fields.

## Decision

### When to apply validators

Apply **`validationLevel: "moderate"`** (`$jsonSchema`) only to collections that:

1. Carry **tenant + audit** fields per [`12-data-management.md`](../../coding-standard/backend/12-data-management.md), and
2. Pass a **read-only prod audit** (`SAFE`) — zero docs violating the proposed schema, and
3. Are listed in normative ERD for that service.

### Explicit skip (no validator)

| Collection | DB | Reason |
|------------|-----|--------|
| `auth_refresh_tokens` | `zero-platform` | Operational — token hash, TTL, rotation; no `ou_id` / audit |
| `auth_credential_throttle` | `zero-platform` | Operational — IP throttle keys |
| `auth_audit_events` | `zero-platform` | Operational — append-only audit log; own retention TTL |

Adding tenant/audit to these in future **requires a new ADR**.

### Rollout order

1. Prod audit (read-only) → backfill if `FIX_FIRST` → staging `collMod` → prod `collMod`.
2. Ops handoff: [`collection-validators-handoff-2026-07-09.md`](../ops/collection-validators-handoff-2026-07-09.md).

### SoT for validator definitions

| Layer | Role |
|-------|------|
| `docs/specs/backend/*/database-erd.md` | Normative — § Schema validation links module (no full JSON paste) |
| `*/scripts/collection-validators.mjs` | **Canonical** implementation SoT |
| `*/scripts/init-db.mjs` | Applies indexes + validators on bootstrap |
| `scripts/ops/collection-validator-registry.mjs` | Aggregates modules per DB |
| `scripts/ops/apply-collection-validators.mjs` | Staging/prod batch apply |
| `scripts/ops/verify-validators.mjs` | Read-only registry + prod baseline parity |
| `scripts/dev/verify-harness-schema.sh` | Harness gate after seed |

**Do not** maintain duplicate JSON schema in handoff docs without linking to module/ERD.

### `agent_fees` precedent

- 3 / 2422 docs had `cr_by: null` → **backfill** before validator ([`agent-fees-cr-by-backfill-prod-2026-07-09.md`](../ops/agent-fees-cr-by-backfill-prod-2026-07-09.md)).
- Pattern: audit → fix data → validate → `collMod`.

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| `validationLevel: "strict"` on prod | Rejects reads/legacy; too risky for 2k+ row collections |
| Validators on all collections including operational | Wrong semantics; forces fake audit fields |
| Validators only in ops script, not ERD/init-db | Drift (current pain point) |

## Consequences

- New collections with tenant data should plan validator in ERD from day one.
- CI/harness gates: `seed-all.sh`, GHA job `harness-schema-verify`, and optional local `VERIFY_HARNESS_SCHEMA=1` in `ci-all.sh`.
- Auth ERD “Deviation — Operational collections” defers to this ADR for validator scope.
