#!/usr/bin/env bash
# Shared helpers for harness dev scripts
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PORT_OFFSET="${PORT_OFFSET:-0}"
export DEV_RUN_DIR="${DEV_RUN_DIR:-$ROOT/.dev-run/$PORT_OFFSET}"
export DEV_LOG_DIR="$DEV_RUN_DIR/logs"
export DEV_PID_DIR="$DEV_RUN_DIR/pids"

dev_ensure_dirs() {
  mkdir -p "$DEV_LOG_DIR" "$DEV_PID_DIR"
  if [[ "$PORT_OFFSET" != "0" ]]; then
    mkdir -p "$DEV_RUN_DIR/harness"
  fi
}

# Resolve harness env file for a service workdir (e.g. backend/auth, frontend/backoffice).
dev_harness_env() {
  local workdir="$1"
  if [[ "$PORT_OFFSET" == "0" ]]; then
    echo "$ROOT/$workdir/.env.harness"
  else
    echo "$DEV_RUN_DIR/harness/$(basename "$workdir").env.harness"
  fi
}

dev_wait_http() {
  local url="$1"
  local label="$2"
  local tries="${3:-60}"
  local i=1
  while [[ $i -le $tries ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "  ✓ $label ready ($url)"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "  ✗ $label failed to become ready: $url" >&2
  return 1
}

dev_ensure_service_deps() {
  local workdir="$1"
  local marker="${2:-fastify}"
  if [[ ! -f "$ROOT/$workdir/package.json" ]]; then
    return 0
  fi
  if [[ ! -d "$ROOT/$workdir/node_modules" ]] || [[ ! -d "$ROOT/$workdir/node_modules/$marker" ]]; then
    echo "  · installing deps in $workdir"
    (cd "$ROOT/$workdir" && npm ci --silent)
  fi
}

dev_start_service() {
  local name="$1"
  local workdir="$2"
  local envfile="$3"
  local pidfile="$DEV_PID_DIR/$name.pid"
  local logfile="$DEV_LOG_DIR/$name.log"

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  · $name already running (pid $(cat "$pidfile"))"
    return 0
  fi

  echo "  → starting $name"
  (
    cd "$ROOT/$workdir"
    nohup node --env-file="$envfile" --enable-source-maps src/server.js \
      >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
  )
}

# Start Next.js dev server (frontend/backoffice-next).
dev_start_frontend() {
  local name="$1"
  local workdir="$2"
  local envfile="$3"
  local pidfile="$DEV_PID_DIR/$name.pid"
  local logfile="$DEV_LOG_DIR/$name.log"

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "  · $name already running (pid $(cat "$pidfile"))"
    return 0
  fi

  echo "  → starting $name"
  (
    cd "$ROOT/$workdir"
    set -a
    # shellcheck disable=SC1090
    source "$envfile"
    set +a
    nohup npm run dev >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
  )
}

dev_stop_service() {
  local name="$1"
  local pidfile="$DEV_PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

dev_load_ports() {
  export GATEWAY_PORT=$((3000 + PORT_OFFSET))
  export AUTH_PORT=$((3001 + PORT_OFFSET))
  export DEMO_PORT=$((3002 + PORT_OFFSET))
  export STAFF_PORT=$((3101 + PORT_OFFSET))
  export INVOICE_PORT=$((3102 + PORT_OFFSET))
  export SMART_REPORT_PORT=$((3103 + PORT_OFFSET))
  export BRANCH_REPORT_PORT=$((3104 + PORT_OFFSET))
  export BACKOFFICE_PORT=$((3005 + PORT_OFFSET))
  export REDIS_DB=$((PORT_OFFSET % 16))
  export MONGO_AUTH_DB="auth_login_${PORT_OFFSET}"
  export GATEWAY_SECRET="${GATEWAY_SECRET:-test-gateway-secret-32-chars-minimum!!}"
  export AUTH_URL="http://127.0.0.1:${AUTH_PORT}"
  export GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}"
  export SMOKE_USERNAME="${SMOKE_USERNAME:-platform_admin}"
  export SMOKE_PASSWORD="${SMOKE_PASSWORD:-1234}"
}
