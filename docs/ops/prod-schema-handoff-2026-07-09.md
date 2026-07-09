# Prod schema handoff — 2026-07-09

> **Human runs on production** — agent does not execute write operations on prod.

## Context

- Drift matrix: [`prod-repo-drift-2026-07-09.md`](../audit/prod-repo-drift-2026-07-09.md)
- Verdict: **repo-wins** — prod missing index documented in ERD/init-db

## Delta

| Database | Collection | Missing index | Spec |
|----------|------------|---------------|------|
| `zero-platform` | `auth_users` | `by_ou_role` | `{ ou_id: 1, role: 1 }` name `by_ou_role` |

## Pre-check (read-only)

```bash
cd /var/www/zero-platform
node scripts/ops/dump-db-schema.mjs --env-file=backend/auth/.env.prod --out /tmp
# Confirm auth_users lacks by_ou_role
```

## Apply (human runs on prod server)

```bash
cd /var/www/zero-platform

# Option A — full auth index bootstrap (idempotent)
node --env-file=backend/auth/.env.prod backend/auth/scripts/init-db.mjs
# Note: also upserts admin user — skip if undesired; use Option B instead

# Option B — single index only (mongosh)
docker exec -it zero-platform-mongodb mongosh mongodb://127.0.0.1:27017/zero-platform --eval '
db.auth_users.createIndex({ ou_id: 1, role: 1 }, { name: "by_ou_role" });
'
```

## Post-check (read-only)

```bash
node scripts/ops/verify-indexes.mjs \
  --baseline docs/audit/prod-schema-baseline-2026-07-09.json \
  --env-file=backend/auth/.env.prod
```

After apply, re-dump baseline if indexes changed:

```bash
node scripts/ops/dump-db-schema.mjs --all-prod --out docs/audit \
  --prod-git-commit="$(git rev-parse HEAD)" \
  --dumped-by="<your-handle>"
```

## Rollback

`createIndex` is idempotent — no rollback needed. Do **not** `dropIndex` without ADR — see [`docs/adrs/`](../adrs/README.md).

## Status

| Step | Result |
|------|--------|
| **Applied** | 2026-07-09 — human via MongoDB Compass (`by_ou_role`; agents index cleanup; smart-report collection drops) |
| **Verified** | `verify-indexes` passed for `zero-platform`, `zero-agent-invoice`, `zero-smart-report` |
| **Baseline** | `prod-schema-baseline-2026-07-09` re-dumped post-apply (`prod_git_commit`: `27f5e80`) |
| **Drift** | [`prod-repo-drift-2026-07-09.md`](../audit/prod-repo-drift-2026-07-09.md) — all rows resolved |
