# Production schema audit baselines

Read-only snapshots from production write MongoDB. **SoT for db-schema sync** — see [completed exec plan](../exec-plans/completed/db-schema-sync-2026-07-09.md).

Current baseline **`prod-schema-baseline-2026-07-15`** — post P1 collMod (4 collections: `auth_users`, `staff_profiles`, `agent_fees`, `reports`). Previous snapshot: `prod-schema-baseline-2026-07-09` (validator rollout 2026-07-09).

## Files

| File | Purpose |
|------|---------|
| `prod-schema-baseline-YYYY-MM-DD.json` | Machine-readable — verify-indexes, verify-validators --baseline |
| `prod-schema-baseline-YYYY-MM-DD.md` | Human review |
| `prod-repo-drift-YYYY-MM-DD.md` | Drift matrix vs ERD / init-db / harness |

## Regenerate (human runs on prod server)

```bash
cd /var/www/zero-platform   # deploy root
git rev-parse HEAD          # pass as --prod-git-commit

node scripts/ops/dump-db-schema.mjs \
  --all-prod \
  --out docs/audit \
  --prod-git-commit="$(git rev-parse HEAD)" \
  --dumped-by="<your-handle>"
```

Single DB:

```bash
node scripts/ops/dump-db-schema.mjs --env-file=backend/auth/.env.prod --out docs/audit
```

## Verify harness vs prod baseline (read-only)

```bash
# All-in-one (after seed)
./scripts/dev/verify-harness-schema.sh

# Or individually
node scripts/ops/verify-validators.mjs --harness
node scripts/ops/verify-validators.mjs --baseline=docs/audit/prod-schema-baseline-2026-07-15.json --harness
node scripts/ops/verify-indexes.mjs --baseline docs/audit/prod-schema-baseline-2026-07-15.json --harness
```

## Redaction

Dump script redacts URI hosts. Do not commit credentials, document samples, or PII.
