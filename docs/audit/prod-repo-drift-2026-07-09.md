# Prod ↔ repo drift matrix

> Source: `prod-schema-baseline-2026-07-09.json` (production read-only dump, **post-validator rollout**)  
> Compared: ERD, `collection-validators.mjs`, `init-db.mjs`, harness  
> **Status:** Indexes + validators resolved as of 2026-07-09.

## Summary

| Verdict | Count | Action |
|---------|-------|--------|
| match (indexes) | 14 | No change |
| match (validators) | 11 | `validationLevel: moderate` on prod/staging/harness |
| resolved (prod-wins → repo) | 3 | Repo synced in `27f5e80` |
| resolved (repo-wins → prod) | 1 | `by_ou_role` added on prod |
| resolved (ADR cleanup) | 5 | Dropped legacy indexes/collections — ADR 002–004 |

---

## Database: `zero-platform`

| Collection | Indexes | Validator | Verdict | Notes |
|------------|---------|-----------|---------|-------|
| `auth_users` | match | **match** | **match** | module + prod baseline |
| `auth_menus` | match | **match** | **match** | |
| `auth_role_permissions` | match | **match** | **match** | |
| `platform_branches` | match | **match** | **match** | |
| `staff_profiles` | match | **match** | **match** | was pending pre-rollout |
| `auth_refresh_tokens` | match | skip | **match** | ADR 005 — operational |
| `auth_credential_throttle` | match | skip | **match** | ADR 005 |
| `auth_audit_events` | match | skip | **match** | ADR 005 |

---

## Database: `zero-agent-invoice`

| Collection | Indexes | Validator | Verdict |
|------------|---------|-----------|---------|
| `agents` | match | **match** | **match** |
| `agent_fees` | match | **match** | **match** — backfill `cr_by` before collMod |
| `agent_iv` | match | **match** | **match** |
| `agent_iv_transaction` | match | **match** | **match** |

---

## Database: `zero-smart-report`

| Collection | Indexes | Validator | Verdict | Notes |
|------------|---------|-----------|---------|-------|
| `reports` | match | **match** | **match** | |
| `download_history` | match | **match** | **match** | |
| fixture collections | dropped | n/a | **resolved** | ADR 003 |

---

## Handoff log

| Date | DB | Change | Verified |
|------|-----|--------|----------|
| 2026-07-09 | `zero-platform` | Added `auth_users.by_ou_role` | `verify-indexes` pass |
| 2026-07-09 | `zero-agent-invoice` | Dropped legacy `agents` indexes | `verify-indexes` pass |
| 2026-07-09 | `zero-smart-report` | Dropped fixture collections + `x` | `verify-indexes` pass |
| 2026-07-09 | all 3 DBs | `$jsonSchema` validators ×11 | `verify-validators` + baseline pass |

See [`collection-validators-handoff-2026-07-09.md`](../ops/collection-validators-handoff-2026-07-09.md), [`prod-schema-handoff-2026-07-09.md`](../ops/prod-schema-handoff-2026-07-09.md).

---

## Harness gates (closure)

- [`scripts/dev/verify-harness-schema.sh`](../../scripts/dev/verify-harness-schema.sh) — registry + baseline validators + indexes
- [`scripts/staging/verify-staging-schema.sh`](../../scripts/staging/verify-staging-schema.sh) — staging validators
