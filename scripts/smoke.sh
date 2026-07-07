#!/usr/bin/env bash
# Smoke test harness dev stack — login + gateway proxy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

if [[ ! -f "$(dev_harness_env backend/auth)" ]]; then
  echo "Missing harness env — run ./scripts/dev-up.sh first (or dev-generate-env.mjs)" >&2
  exit 1
fi

dev_load_ports

SMOKE_USERNAME="${SMOKE_USERNAME:-platform_admin}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-1234}"

echo "Smoke test (offset=$PORT_OFFSET)"

curl -sf "http://127.0.0.1:${AUTH_PORT}/healthz" >/dev/null
echo "  ✓ auth /healthz"

curl -sf "http://127.0.0.1:${GATEWAY_PORT}/healthz" >/dev/null
echo "  ✓ gateway /healthz"

curl -sf "http://127.0.0.1:${DEMO_PORT}/healthz" >/dev/null
echo "  ✓ demo-service /healthz"

curl -sf "http://127.0.0.1:${STAFF_PORT}/healthz" >/dev/null
echo "  ✓ staff /healthz"

curl -sf "http://127.0.0.1:${INVOICE_PORT}/healthz" >/dev/null
echo "  ✓ agent-invoice /healthz"

curl -sf "http://127.0.0.1:${SMART_REPORT_PORT}/healthz" >/dev/null
echo "  ✓ smart-report /healthz"

curl -sf "http://127.0.0.1:${BRANCH_REPORT_PORT}/healthz" >/dev/null
echo "  ✓ branch-report /healthz"

curl -sf "http://127.0.0.1:${INVOICE_PORT}/metrics" | grep -q process_uptime_seconds
echo "  ✓ agent-invoice /metrics"

curl -sf "http://127.0.0.1:${SMART_REPORT_PORT}/metrics" | grep -q process_uptime_seconds
echo "  ✓ smart-report /metrics"

curl -sf "http://127.0.0.1:${BRANCH_REPORT_PORT}/metrics" | grep -q process_uptime_seconds
echo "  ✓ branch-report /metrics"

TOKEN_JSON=$(curl -sf -X POST "http://127.0.0.1:${AUTH_PORT}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${SMOKE_USERNAME}\",\"password\":\"${SMOKE_PASSWORD}\",\"client_kind\":\"native\"}")

ACCESS_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.access_token||'')" "$TOKEN_JSON")
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "  ✗ login failed — no access_token" >&2
  echo "$TOKEN_JSON" >&2
  exit 1
fi
echo "  ✓ auth login"

ME=$(curl -sf "http://127.0.0.1:${GATEWAY_PORT}/api/v1/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$ME" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!j.data&&!j.sub&&!j.user_id){process.exit(1)}"
echo "  ✓ gateway GET /api/v1/me"

BRANCHES=$(curl -sf "http://127.0.0.1:${GATEWAY_PORT}/auth/me/branches" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$BRANCHES" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!Array.isArray(j.branches)||j.branches.length<1)process.exit(1)"
echo "  ✓ gateway GET /auth/me/branches"

# Frontend dev server — checked only when booted (dev-up.sh --with-frontend)
if [[ -n "${BACKOFFICE_PORT:-}" ]] && [[ -f "$DEV_RUN_DIR/pids/backoffice.pid" ]]; then
  HTML=$(curl -sf "http://127.0.0.1:${BACKOFFICE_PORT}/")
  if ! echo "$HTML" | grep -qi '<div id="root">'; then
    echo "  ✗ backoffice served unexpected HTML" >&2
    exit 1
  fi
  echo "  ✓ backoffice serves app shell"

  # Vite proxy must reach auth through the frontend origin (same path the browser uses)
  PROXY_LOGIN=$(curl -sf -X POST "http://127.0.0.1:${BACKOFFICE_PORT}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${SMOKE_USERNAME}\",\"password\":\"${SMOKE_PASSWORD}\",\"client_kind\":\"native\"}")
  node -e "const j=JSON.parse(process.argv[1]); if(!j.access_token) process.exit(1)" "$PROXY_LOGIN"
  echo "  ✓ backoffice /auth proxy (login via frontend origin)"
fi

# Optional Bruno CLI if installed
if command -v bru >/dev/null 2>&1; then
  echo "  · running Bruno health collections (optional)"
  bru run "$ROOT/backend/_bruno/auth/health" --env-var "baseUrl=http://127.0.0.1:${AUTH_PORT}" 2>/dev/null || true
fi

echo ""
echo "✓ smoke passed"
