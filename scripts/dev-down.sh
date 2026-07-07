#!/usr/bin/env bash
# Tear down harness dev stack for current PORT_OFFSET.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

echo "Harness dev-down (PORT_OFFSET=$PORT_OFFSET)"

if [[ -f "$ROOT/backend/docker-compose.observability.yml" ]]; then
  PORT_OFFSET="$PORT_OFFSET" DEV_RUN_DIR="$DEV_RUN_DIR" \
    "$SCRIPT_DIR/dev-obs-down.sh" 2>/dev/null || true
fi

for svc in backoffice branch-report smart-report agent-invoice staff demo-service gateway auth; do
  dev_stop_service "$svc"
done

echo "Stopped services for offset $PORT_OFFSET"
echo "Logs retained at $DEV_LOG_DIR (remove $DEV_RUN_DIR to clean fully)"
