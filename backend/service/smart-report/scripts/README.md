# Smart Report scripts

## migrate-report-scripts.mjs

Compiles existing Booster-style report scripts to `compiledScript` and updates validation fields in MongoDB.

| Flag | Effect |
|------|--------|
| `--dry-run` | Compile only; no DB writes or read-DB execution |
| `--test-run` | Run compiled scripts against `MONGODB_URI_READ` (yesterday date range) |
| `--fail-on-error` | Exit code 1 if any report fails compile or test-run |

**P1 exception:** `Rolling Commission 777WW [New] P1` is set to `enabled: false` (uses `insert()`). It is skipped from compile/test and does not count as a migration failure.

```bash
# Preview compile results
npm run migrate:scripts -- --dry-run

# Production migrate (recommended)
npm run migrate:scripts -- --test-run --fail-on-error
```

## Deploy runbook (release 1)

1. Deploy smart-report service (compiler + validate/test-run APIs + transitional compile-on-read).
2. Run migration against the target database:
   ```bash
   cd backend/service/smart-report
   npm run migrate:scripts -- --test-run --fail-on-error
   ```
3. Verify ≥12/13 reports pass; P1 is disabled.
4. Restart the service (or reload scheduler) so cron tasks pick up `compiledScript`.

Release 2 cleanup (Phase 5): remove `prepareBoosterStyleScript`, compile-on-read fallback, and transitional regex paths.

## Other scripts

| Script | npm command | Purpose |
|--------|-------------|---------|
| `init-db.mjs` | `npm run init:db` | Create MongoDB indexes |
| `seed-example-data.mjs` | `npm run seed:example` | Dev sample reports |
