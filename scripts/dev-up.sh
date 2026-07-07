#!/usr/bin/env bash
# Boot local dev stack with worktree isolation (PORT_OFFSET).
# Usage: ./scripts/dev-up.sh [--no-obs] [--with-frontend] [--skip-seed]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

WITH_OBS=true
WITH_FRONTEND=false
SKIP_SEED=false
for arg in "$@"; do
  case "$arg" in
    --no-obs) WITH_OBS=false ;;
    --with-frontend) WITH_FRONTEND=true ;;
    --skip-seed) SKIP_SEED=true ;;
  esac
done

dev_ensure_dirs
echo "Harness dev-up (PORT_OFFSET=$PORT_OFFSET, run dir=$DEV_RUN_DIR)"

echo "1. Docker dependencies (MongoDB + Redis)"
cd "$ROOT/backend"
if ! docker compose up -d 2>/dev/null; then
  echo "  · compose recreate skipped — starting existing containers"
  docker start zero-platform-mongodb zero-platform-redis 2>/dev/null || true
fi
for i in $(seq 1 45); do
  if docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "  ✓ mongodb ready"
    break
  fi
  if docker exec zero-platform-mongodb mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "  ✓ mongodb ready"
    break
  fi
  if [[ $i -eq 45 ]]; then
    echo "  ✗ mongodb failed to become ready" >&2
    exit 1
  fi
  sleep 1
done

echo "2. Refresh harness env (.env.harness)"
node "$SCRIPT_DIR/dev-generate-env.mjs" "$DEV_RUN_DIR" "$PORT_OFFSET"
dev_load_ports

HARNESS_AUTH="$(dev_harness_env backend/auth)"
HARNESS_GATEWAY="$(dev_harness_env backend/gateway)"
HARNESS_DEMO="$(dev_harness_env backend/service/demo-service)"
HARNESS_STAFF="$(dev_harness_env backend/service/staff)"
HARNESS_INVOICE="$(dev_harness_env backend/service/agent-invoice)"
HARNESS_SMART="$(dev_harness_env backend/service/smart-report)"
HARNESS_BRANCH="$(dev_harness_env backend/service/branch-report)"
HARNESS_BACKOFFICE="$(dev_harness_env frontend/backoffice)"

echo "3. Initialize auth database"
cd "$ROOT/backend/auth"
# Silent first run: idempotent index creation may log to stderr; retry with output on failure.
node --env-file="$HARNESS_AUTH" scripts/init-db.mjs 2>/dev/null || \
  node --env-file="$HARNESS_AUTH" scripts/init-db.mjs

if [[ "$SKIP_SEED" == false ]]; then
  echo "3b. Seed example data (all services)"
  "$SCRIPT_DIR/seed-all.sh"
fi

echo "4. Start services"
dev_ensure_service_deps backend/auth
dev_ensure_service_deps backend/gateway
dev_ensure_service_deps backend/service/demo-service
dev_ensure_service_deps backend/service/staff
dev_ensure_service_deps backend/service/agent-invoice
dev_ensure_service_deps backend/service/smart-report
dev_ensure_service_deps backend/service/branch-report
dev_start_service auth backend/auth "$HARNESS_AUTH"
dev_start_service gateway backend/gateway "$HARNESS_GATEWAY"
dev_start_service demo-service backend/service/demo-service "$HARNESS_DEMO"
dev_start_service staff backend/service/staff "$HARNESS_STAFF"
dev_start_service agent-invoice backend/service/agent-invoice "$HARNESS_INVOICE"
dev_start_service smart-report backend/service/smart-report "$HARNESS_SMART"
dev_start_service branch-report backend/service/branch-report "$HARNESS_BRANCH"

dev_wait_http "http://127.0.0.1:${AUTH_PORT}/healthz" "auth"
dev_wait_http "http://127.0.0.1:${GATEWAY_PORT}/healthz" "gateway"
dev_wait_http "http://127.0.0.1:${DEMO_PORT}/healthz" "demo-service"
dev_wait_http "http://127.0.0.1:${STAFF_PORT}/healthz" "staff"
dev_wait_http "http://127.0.0.1:${INVOICE_PORT}/healthz" "agent-invoice"
dev_wait_http "http://127.0.0.1:${SMART_REPORT_PORT}/healthz" "smart-report"
dev_wait_http "http://127.0.0.1:${BRANCH_REPORT_PORT}/healthz" "branch-report"

if [[ "$WITH_FRONTEND" == true ]]; then
  echo "4b. Frontend (backoffice)"
  dev_ensure_service_deps frontend/backoffice vite
  dev_start_frontend backoffice frontend/backoffice "$HARNESS_BACKOFFICE"
  dev_wait_http "http://127.0.0.1:${BACKOFFICE_PORT}/" "backoffice"
fi

if [[ "$WITH_OBS" == true ]] && [[ -f "$ROOT/backend/docker-compose.observability.yml" ]]; then
  echo "5. Observability stack"
  PORT_OFFSET="$PORT_OFFSET" DEV_RUN_DIR="$DEV_RUN_DIR" \
    "$SCRIPT_DIR/dev-obs-up.sh" || echo "  ⚠ observability stack skipped (not configured yet)"
fi

echo ""
echo "Stack ready:"
echo "  auth          http://127.0.0.1:${AUTH_PORT}"
echo "  gateway       http://127.0.0.1:${GATEWAY_PORT}"
echo "  staff         http://127.0.0.1:${STAFF_PORT}"
echo "  agent-invoice http://127.0.0.1:${INVOICE_PORT}"
echo "  smart-report  http://127.0.0.1:${SMART_REPORT_PORT}"
echo "  branch-report http://127.0.0.1:${BRANCH_REPORT_PORT}"
if [[ "$WITH_FRONTEND" == true ]]; then
  echo "  backoffice http://127.0.0.1:${BACKOFFICE_PORT}"
fi
echo "  logs     $DEV_LOG_DIR"
echo "Run: ./scripts/smoke.sh"
