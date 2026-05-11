# Latency Benchmark Report

Generated: 2026-05-11

## Method

- Harness: integration test `src/modules/metrics/tests/integration-test/slo-latency.test.js`
- Sampling: 20 sequential samples per scenario (to avoid non-target write rate-limit interference)
- Environment: local test runtime with in-memory mocked collections
- Error scenarios captured explicitly:
  - `400 INVALID_PARAM` (invalid item id format)
  - `404 RESOURCE_NOT_FOUND` (valid id format, resource not found)
  - `412 VERSION_CONFLICT` (malformed `If-Match` optimistic-lock header)

## Thresholds

| Metric                     | Threshold   |
| -------------------------- | ----------- |
| Dashboard summary          | p95 < 400ms |
| Items list                 | p95 < 500ms |
| Error 400 invalid id       | p95 < 250ms |
| Error 404 not found        | p95 < 250ms |
| Error 412 version conflict | p95 < 250ms |
| Aggregated error response  | p95 < 250ms |

## Result

- Automated assertions are green for all thresholds in `npm test`.
- Report formatting is validated by `src/modules/metrics/tests/unit/latency-report.test.js`.

## Notes

- This report is intended for release-gate verification in CI/local test context.
- Production/staging latency must be tracked with runtime observability dashboards.
