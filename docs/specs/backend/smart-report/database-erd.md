# smart-report — Database ERD

Synced with prod baseline [`docs/audit/prod-schema-baseline-2026-07-09.json`](../../../audit/prod-schema-baseline-2026-07-09.json) and `init-db.mjs` / app bootstrap.

## `reports`

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | unique index `IDX_REPORTS_NAME_UNIQUE` |
| `script` | string | user mongo shell script |
| `params` | object | injection map |
| `outputFormat` | `csv` \| `excel` | export format |
| `schedule` | object | UI schedule → cron |
| `enabled` | boolean | index `IDX_REPORTS_ENABLED` |
| `compiledScript` | string | after validate+compile |
| audit | `cr_*`, `upd_*` | ETag from `upd_date` |

## `download_history`

| Field | Notes |
|-------|-------|
| `reportId` | FK reports |
| `reportName`, `outputFormat` | denormalized |
| `filePath`, `status` | `running` \| `success` \| `failed` |
| `triggeredBy` | `manual` \| `scheduler` | who/what started the run |
| `startedAt` | index |

Write-once — no `upd_*`

## Indexes (normative)

| Collection | Name | Keys |
|------------|------|------|
| `reports` | `IDX_REPORTS_NAME_UNIQUE` | `{ name: 1 }` unique |
| `reports` | `IDX_REPORTS_ENABLED` | `{ enabled: 1 }` |
| `reports` | `IDX_REPORTS_SCHEDULE_FREQUENCY` | `{ "schedule.frequency": 1 }` |
| `download_history` | `IDX_DOWNLOAD_HISTORY_REPORT_LIST` | `{ reportId: 1, startedAt: -1 }` |
| `download_history` | `IDX_DOWNLOAD_HISTORY_RECENT` | `{ startedAt: -1 }` |

## Integration test fixtures (harness only)

`sandbox_runner_fixture`, `scheduler_fixture`, `validate_test_run_fixture` — used by integration tests under `src/modules/reports/tests/integration-test/`; created/deleted per test run. **Not** in prod (removed 2026-07-09) or `init-db.mjs`.

## Schema validation (`$jsonSchema`)

`validationLevel: "moderate"` — SoT: [`collection-validators.mjs`](../../../../backend/service/smart-report/scripts/collection-validators.mjs). Applied by [`init-db.mjs`](../../../../backend/service/smart-report/scripts/init-db.mjs). Policy: [ADR 005](../../../adrs/005-mongodb-collection-validators-policy.md).

| Collection | Required (summary) |
|------------|-------------------|
| `reports` | `name`, `script`, `enabled` |
| `download_history` | `reportId`, `startedAt`, `status` |
