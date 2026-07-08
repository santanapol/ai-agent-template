#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

dev_load_ports

export VLOGS_PORT=$((9428 + PORT_OFFSET))
export VMETRICS_PORT=$((8428 + PORT_OFFSET))

cat >"$DEV_RUN_DIR/prometheus-scrape.yml" <<EOF
scrape_configs:
  - job_name: harness-services
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'host.docker.internal:${AUTH_PORT}'
          - 'host.docker.internal:${GATEWAY_PORT}'
          - 'host.docker.internal:${STAFF_PORT}'
          - 'host.docker.internal:${DEMO_PORT}'
          - 'host.docker.internal:${INVOICE_PORT}'
          - 'host.docker.internal:${SMART_REPORT_PORT}'
          - 'host.docker.internal:${BRANCH_REPORT_PORT}'
        labels:
          port_offset: '${PORT_OFFSET}'
EOF

cd "$ROOT/backend"
docker compose -f docker-compose.observability.yml up -d

echo "Observability ready:"
echo "  VictoriaLogs    http://127.0.0.1:${VLOGS_PORT}"
echo "  VictoriaMetrics http://127.0.0.1:${VMETRICS_PORT}"
