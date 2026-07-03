# smart-report — Technical architecture

**Package:** `backend/service/smart-report/` · port **3103**

## HTTP contract (prose — no openapi.yaml)

Mount prefix `/api/v1/smart-reports` (`app.js`). Static paths registered before `/:id`.

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| POST | `/validate` | `validateReportHandler` | acorn AST — no DB write |
| POST | `/test-run` | `testRunReportHandler` | sandbox + `TEST_RUN_TOKEN` |
| GET | `/history` | `listHistoryHandler` | pagination |
| GET | `/download/:fileId` | `downloadFileHandler` | streams file |
| GET | `/` | `listReportsHandler` | |
| POST | `/` | `createReportHandler` | unique `name` |
| GET | `/:id` | `getReportHandler` | ETag from `upd_date` |
| PUT | `/:id` | `updateReportHandler` | If-Match |
| DELETE | `/:id` | `deleteReportHandler` | |
| POST | `/:id/run` | `runReportHandler` | manual trigger |

Probes: `GET /healthz`, `GET /readyz` (Mongo ping)

## Script pipeline

1. **`script-validator.service.js`** — `acorn` parse + `acorn-walk` — block writes (`insert`, `update`, `delete`, …)
2. **`script-compiler.service.js`** — compile to `compiledScript` (cursor → array)
3. **`sandbox-runner.service.js`** — VM run against `MONGODB_URI_READ`
4. **`file-exporter.service.js`** — CSV (`json2csv`) / Excel (`exceljs`)

## Scheduler

- **`scheduler.service.js`** — `node-cron` per enabled report
- `scheduleToCron()` — daily/weekly/monthly; `dayOfMonth: 'last'` → cron 28–31 + guard
- Boot: `server.js` → `initializeScheduler(db)`
- Reload on report CRUD via `reloadScheduler()`

## Configuration

| Env | Purpose |
|-----|---------|
| `MONGODB_URI` | app metadata DB |
| `MONGODB_URI_READ` | read-only script execution |
| `GATEWAY_SHARED_SECRET` | mesh trust |
| `REPORT_OUTPUT_DIR` | export path |
| `TEST_RUN_TIMEOUT_MS` | sandbox limit |

## Error codes

Domain codes in [codes.yaml](../../../../backend/service/smart-report/codes.yaml) — `spec:codes` gate
