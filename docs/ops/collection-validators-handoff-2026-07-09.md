# Collection validators handoff — 2026-07-09

> **Status: complete** — prod `collMod` done 2026-07-09; `verify-validators` passed (11 collections, 3 DBs).  
> Policy: [ADR 005](../adrs/005-mongodb-collection-validators-policy.md) · SoT: `backend/*/scripts/collection-validators.mjs`  
> **BE review packet:** [`be-review-erd-validators-2026-07-09.md`](../exec-plans/completed/be-review-erd-validators-2026-07-09.md)

## Status

| Collection | DB | Prod audit | Staging | Prod |
|------------|-----|------------|---------|------|
| `staff_profiles` | `zero-platform` | SAFE | **done** | **done** |
| `auth_users` | `zero-platform` | SAFE (9) | **done** | **done** |
| `platform_branches` | `zero-platform` | SAFE (1) | **done** | **done** |
| `auth_menus` | `zero-platform` | SAFE (23) | **done** | **done** |
| `auth_role_permissions` | `zero-platform` | SAFE (5) | **done** | **done** |
| `agents` | `zero-agent-invoice` | SAFE (15) | **done** | **done** |
| `agent_iv` | `zero-agent-invoice` | SAFE (400) | **done** | **done** |
| `agent_iv_transaction` | `zero-agent-invoice` | SAFE (1760) | **done** | **done** |
| `agent_fees` | `zero-agent-invoice` | backfill done | **done** | **done** |
| `reports` | `zero-smart-report` | SAFE (13) | **done** | **done** |
| `download_history` | `zero-smart-report` | SAFE (34) | **done** | **done** |

**Skip (ADR 005):** `auth_refresh_tokens`, `auth_credential_throttle`, `auth_audit_events`

## Verification (2026-07-09)

```bash
node scripts/ops/verify-validators.mjs --env-file=backend/auth/.env.prod --db=zero-platform
node scripts/ops/verify-validators.mjs --env-file=backend/service/agent-invoice/.env.prod --db=zero-agent-invoice
node scripts/ops/verify-validators.mjs --env-file=backend/service/smart-report/.env.prod --db=zero-smart-report
# all passed ✓
```

Re-dump baseline (validators in JSON):

```bash
node scripts/ops/dump-db-schema.mjs --all-prod --out docs/audit \
  --prod-git-commit="$(git rev-parse HEAD)" \
  --dumped-by="<handle>"
```

## Apply reference (historical)

Prod required admin URI (`MONGODB_ADMIN_URI`) — service accounts lack `collMod` (code 13).

```bash
MONGODB_ADMIN_URI='mongodb+srv://<admin>@...' \
  node scripts/ops/apply-collection-validators.mjs --prod-all
```

## Module map

| Module | Collections |
|--------|-------------|
| [`backend/auth/scripts/collection-validators.mjs`](../../backend/auth/scripts/collection-validators.mjs) | `auth_users`, `platform_branches`, `auth_menus`, `auth_role_permissions` |
| [`backend/service/staff/scripts/collection-validators.mjs`](../../backend/service/staff/scripts/collection-validators.mjs) | `staff_profiles` |
| [`backend/service/agent-invoice/scripts/collection-validators.mjs`](../../backend/service/agent-invoice/scripts/collection-validators.mjs) | `agents`, `agent_fees`, `agent_iv`, `agent_iv_transaction` |
| [`backend/service/smart-report/scripts/collection-validators.mjs`](../../backend/service/smart-report/scripts/collection-validators.mjs) | `reports`, `download_history` |

**Harness / staging:** validators via `init-db`; gates: [`verify-harness-schema.sh`](../../scripts/dev/verify-harness-schema.sh), [`verify-staging-schema.sh`](../../scripts/staging/verify-staging-schema.sh).
