# Confidence Map — smart-report

Owner: Berlin. src 58/58 read (2026-07-03 re-harden).

## Source scan

| Check | Value |
|-------|-------|
| Package root | `backend/service/smart-report/` |
| `src/` files | 58/58 |
| OpenAPI | [openapi.yaml](../../../../backend/service/smart-report/openapi.yaml) (skeleton; full CRUD later) |

## Section confidence

| Section | Confidence | Status |
|---------|------------|--------|
| smart-report-spec | 90% | synced |
| business-domain | 88% | synced |
| technical-architecture (incl. API table) | 92% | synced |
| database-erd | 90% | synced |

## Extraction coverage

| Artifact | Code | Spec | Status |
|----------|------|------|--------|
| Env `REPORTS_STORAGE_DIR` | `file-exporter.service.js` | technical-architecture §Configuration | synced |
| Env `REPORT_SCRIPT_TIMEOUT_MS` | `sandbox-runner.service.js` | technical-architecture §Configuration | synced |
| Test DB fallback | `database-read.js` (`NODE_ENV=test`) | technical-architecture §Configuration | synced |
| Permission key | `reports:smart` | business-domain §Permissions | synced |
| `triggeredBy` values | scheduler + manual run | database-erd | synced |
| acorn validator / cron | `script-validator`, `scheduler` | technical-architecture | synced |
| codes.yaml | `spec:codes` gate | smart-report-spec | synced |

Pre-harden: `npm run ci` + `spec:consistency` + `spec:codes` — required.
