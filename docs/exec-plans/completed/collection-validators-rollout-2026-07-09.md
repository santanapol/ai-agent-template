---
status: completed
created: 2026-07-09
updated: 2026-07-09
completed: 2026-07-09
services: [auth, staff, agent-invoice, smart-report]
---

# Collection validators rollout — completed 2026-07-09

## Objective

Selective `$jsonSchema` validators (`validationLevel: moderate`) on 11 tenant/audit collections across 3 prod DBs — with module SoT, init-db wiring, prod/staging/harness rollout, and closure gates.

## Phases

| Phase | Work | Status |
|-------|------|--------|
| 0 | Schema sync, prod baseline, ADR 001–004 | done — [`db-schema-sync`](./db-schema-sync-2026-07-09.md) |
| ADR | Validator policy ADR 005 | done |
| Rollout | Staging + prod `collMod` ×11 | done — [`collection-validators-handoff`](../../ops/collection-validators-handoff-2026-07-09.md) |
| SoT | `collection-validators.mjs` per service + registry | done |
| init-db | Wire validators auth/staff/agent-invoice/smart-report | done |
| Closure | Harness/staging gates, `--baseline` verify, docs | done |

## Collections (11)

`auth_users`, `platform_branches`, `auth_menus`, `auth_role_permissions`, `staff_profiles`, `agents`, `agent_fees`, `agent_iv`, `agent_iv_transaction`, `reports`, `download_history`

**Skip:** `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events` (ADR 005)

## Automation (closure)

| Script | Role |
|--------|------|
| [`scripts/ops/schema-verify-targets.mjs`](../../../scripts/ops/schema-verify-targets.mjs) | Shared harness/staging/prod targets |
| [`scripts/ops/verify-validators.mjs`](../../../scripts/ops/verify-validators.mjs) | Registry + prod baseline parity |
| [`scripts/dev/verify-harness-schema.sh`](../../../scripts/dev/verify-harness-schema.sh) | Gate after `seed-all.sh` |
| [`scripts/staging/verify-staging-schema.sh`](../../../scripts/staging/verify-staging-schema.sh) | Gate after `staging-seed-all.sh` |

## BE handoff

[`be-review-erd-validators-2026-07-09.md`](./be-review-erd-validators-2026-07-09.md) — BE-001/002/003 signed off; audit report [`be-review-erd-validators-report-2026-07-09.md`](./be-review-erd-validators-report-2026-07-09.md).

## Follow-up (out of scope)

- TD-018: orphan `agent_fees` data-quality
