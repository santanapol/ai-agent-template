# Latency Benchmark Report

Generated: 2026-05-11

## Method

- Harness: integration test `src/modules/metrics/tests/integration-test/slo-latency.test.js`
- Sampling: 30 sequential requests per endpoint, p95 from sample set
- Environment: local test runtime with in-memory mocked collections

## Thresholds

| Metric            | Threshold   |
| ----------------- | ----------- |
| Dashboard summary | p95 < 400ms |
| Items list        | p95 < 500ms |
| Error response    | p95 < 250ms |

## Result

- Automated assertions are green for all three thresholds in `npm test`.
- Report formatting is validated by `src/modules/metrics/tests/unit/latency-report.test.js`.

## Notes

- This report is for release-gate verification in CI/local test context.
- Production/staging latency should be tracked with runtime observability dashboards.
