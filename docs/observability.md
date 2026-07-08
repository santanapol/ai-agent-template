# Observability (local dev)

Ephemeral observability stack per worktree instance. Agents query logs and metrics to validate behavior. **Not used on staging/production.**

Docker: `backend/docker-compose.observability.yml` — project name `zero-platform` (same group as MongoDB/Redis from `docker-compose.deps.yml`).

## Ports (default offset 0)

| Signal | API | Port |
|--------|-----|------|
| Logs | VictoriaLogs (LogsQL) | `9428 + PORT_OFFSET` |
| Metrics | VictoriaMetrics (PromQL) | `8428 + PORT_OFFSET` |

Services run on host; Vector tails log files from `.dev-run/<offset>/logs/`; VictoriaMetrics scrapes `/metrics` on all harness-booted backend services.

## Scraped services

| Service | Port (offset 0) | Metrics source |
|---------|-----------------|----------------|
| auth | 3001 | `basic-metrics.js` |
| gateway | 3000 | `basic-metrics.js` |
| demo-service | 3002 | prom-client plugin |
| staff | 3101 | prom-client (`collectDefaultMetrics` + custom counters) |
| agent-invoice | 3102 | `basic-metrics.js` |
| smart-report | 3103 | `basic-metrics.js` |
| branch-report | 3104 | `basic-metrics.js` |

## Boot

```bash
./scripts/dev/dev-up.sh          # includes observability when compose file exists
# or after dev-up:
PORT_OFFSET=0 ./scripts/dev/dev-obs-up.sh
```

## Query examples (agent)

Replace ports if `PORT_OFFSET != 0`.

### PromQL — process uptime

```bash
curl -sG 'http://127.0.0.1:8428/api/v1/query' \
  --data-urlencode 'query=process_uptime_seconds'
```

Per-service:

```bash
curl -sf "http://127.0.0.1:3102/metrics" | grep process_uptime_seconds
```

### LogsQL — recent auth logs

```bash
curl -sG 'http://127.0.0.1:9428/select/logsql/query' \
  --data-urlencode 'query=service:auth' \
  --data-urlencode 'limit=20'
```

### Acceptance-style checks

- **Startup:** after `dev-up`, all `/healthz` endpoints return 200 within 60s.
- **Metrics:** `process_uptime_seconds` > 0 for auth, gateway, staff, agent-invoice, smart-report, branch-report (and demo when scraped).
- **Logs:** harness dev sets `LOG_PRETTY=false` on staff (and explicit false on auth/gateway); Vector can parse JSON lines with `service` field from log filenames.

## Teardown

```bash
./scripts/dev/dev-down.sh
```

## Related

- [golden-principles.md](./golden-principles.md) § Structured logging
- [AGENTS.md](../AGENTS.md)
- [backend/RUNBOOK.md](../backend/RUNBOOK.md)
