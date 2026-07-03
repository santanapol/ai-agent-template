# smart-report — Database ERD

Consolidated from `docs/db/erd.md` — **OBSERVED** vs `init-db.mjs`

## `reports`

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | unique index |
| `script` | string | user mongo shell script |
| `params` | object | injection map |
| `outputFormat` | `csv` \| `excel` | export format |
| `schedule` | object | UI schedule → cron |
| `enabled` | boolean | |
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

## Indexes

Unique `name`; `enabled`; history by `reportId+startedAt`
