#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

export PORT_OFFSET
export VLOGS_PORT=$((9428 + PORT_OFFSET))
export VMETRICS_PORT=$((8428 + PORT_OFFSET))
export DEV_RUN_DIR

cd "$ROOT/backend"
docker compose -f docker-compose.observability.yml down 2>/dev/null || true
echo "Observability stack stopped (offset=$PORT_OFFSET)"
