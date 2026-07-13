# smart-report — `schedule.frequency` index (TD-027)

> **Status:** code merged — apply on staging/prod per checklist below

## Index

```javascript
use zero-smart-report

db.reports.createIndex(
  { "schedule.frequency": 1 },
  { name: "IDX_REPORTS_SCHEDULE_FREQUENCY" },
)
```

## Verify

```bash
node scripts/ops/verify-indexes.mjs \
  --baseline=docs/audit/prod-schema-baseline-2026-07-09.json \
  --env-file=backend/service/smart-report/.env.staging
```

Harness (after `init-db`):

```bash
./scripts/dev/verify-harness-schema.sh
```

## Checklist

- [ ] Staging `createIndex` applied
- [ ] Prod `createIndex` applied (human on prod server)
- [ ] `verify-indexes.mjs` passes staging/prod
