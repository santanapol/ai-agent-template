# smart-report — Technical architecture

**Package:** `backend/service/smart-report/` · port **3103**

## HTTP contract

**SoT:** [`openapi.yaml`](../../../../backend/service/smart-report/openapi.yaml) (`openapi: 3.1.0`) + `npm run spec:lint`.

Mount prefix `/api/v1/smart-reports` (`app.js`). Static paths registered before `/:id`.

| Method | Path | Handler | OpenAPI |
|--------|------|---------|---------|
| POST | `/validate` | `validateReportHandler` | yes (skeleton) |
| POST | `/test-run` | `testRunReportHandler` | yes |
| GET | `/history` | `listHistoryHandler` | prose only (later) |
| GET | `/download/:fileId` | `downloadFileHandler` | yes |
| GET | `/` | `listReportsHandler` | yes |
| POST | `/` | `createReportHandler` | yes |
| GET | `/:id` | `getReportHandler` | prose only (later) |
| PUT | `/:id` | `updateReportHandler` | prose only (later) |
| DELETE | `/:id` | `deleteReportHandler` | prose only (later) |
| POST | `/:id/run` | `runReportHandler` | prose only (later) |

Probes: `GET /healthz`, `GET /readyz` (in OpenAPI)

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
| `MONGODB_URI_READ` | read-only script execution (required in prod; in `NODE_ENV=test` falls back to `MONGODB_URI` then `mongodb://localhost:27017`) |
| `GATEWAY_SHARED_SECRET` | mesh trust |
| `REPORTS_STORAGE_DIR` | export file path (default under package `storage/`) |
| `REPORT_SCRIPT_TIMEOUT_MS` | sandbox execution limit (default 120000 ms) |
| `TEST_RUN_TOKEN_SECRET` | HMAC for `/test-run` one-time token |
| `TEST_RUN_TOKEN_TTL_MS` | test-run token TTL |

## Error codes

Domain codes in [codes.yaml](../../../../backend/service/smart-report/codes.yaml) — `spec:codes` gate
