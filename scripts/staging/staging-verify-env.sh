#!/usr/bin/env bash
# Verify backend .env.staging files have required keys (run on staging server).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"

fail=0

check_file() {
  local label="$1"
  local file="$2"
  shift 2
  if [[ ! -f "$file" ]]; then
    echo "✗ missing $label: $file"
    fail=1
    return
  fi
  for key in "$@"; do
    if ! grep -q "^${key}=" "$file"; then
      echo "✗ $label missing $key"
      fail=1
    fi
  done
}

check_file "auth" "$BACKEND/auth/.env.staging" DATABASE_URI
check_file "gateway" "$BACKEND/gateway/.env.staging" GATEWAY_SECRET
check_file "staff" "$BACKEND/service/staff/.env.staging" GATEWAY_SHARED_SECRET MONGODB_URI
check_file "agent-invoice" "$BACKEND/service/agent-invoice/.env.staging" GATEWAY_SHARED_SECRET MONGODB_URI_READ
check_file "smart-report" "$BACKEND/service/smart-report/.env.staging" GATEWAY_SHARED_SECRET MONGODB_URI_READ
check_file "branch-report" "$BACKEND/service/branch-report/.env.staging" GATEWAY_SHARED_SECRET MONGODB_URI_READ PORT

if [[ -f "$BACKEND/service/branch-report/.env.staging" ]]; then
  port=$(grep '^PORT=' "$BACKEND/service/branch-report/.env.staging" | cut -d= -f2)
  if [[ "$port" != "3104" ]]; then
    echo "✗ branch-report PORT must be 3104 (got $port)"
    fail=1
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "staging-verify-env failed — see backend/ENV.md"
  exit 1
fi

echo "✓ staging-verify-env passed"
