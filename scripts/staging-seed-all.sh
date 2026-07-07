#!/usr/bin/env bash
# Bootstrap + seed example data on staging (uses backend/*/.env.staging).
# Idempotent — safe to re-run.
#
# Prereqs:
#   bash scripts/staging-init-env.sh   # creates .env.staging from .env.example
#   edit .env.staging (DATABASE_URI, secrets, ADMIN_PASSWORD, …)
#   docker compose up (see server-environment/staging/RUNBOOK.md)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/backend"

staging_env() {
  echo "$BACKEND/$1/.env.staging"
}

SERVICES=(
  auth
  gateway
  service/staff
  service/smart-report
  service/agent-invoice
  service/branch-report
)

for rel in "${SERVICES[@]}"; do
  f="$(staging_env "$rel")"
  if [[ ! -f "$f" ]]; then
    echo "Missing $f — run: bash scripts/staging-init-env.sh" >&2
    exit 1
  fi
done

ENV_AUTH="$(staging_env auth)"
ENV_STAFF="$(staging_env service/staff)"
ENV_SMART="$(staging_env service/smart-report)"
ENV_INVOICE="$(staging_env service/agent-invoice)"
ENV_BRANCH="$(staging_env service/branch-report)"

echo "Staging seed-all (.env.staging)"

echo ""
echo "==> auth — indexes + admin user (init-db)"
node --env-file="$ENV_AUTH" "$BACKEND/auth/scripts/init-db.mjs"

echo ""
echo "==> auth — example users + menu permissions"
node --env-file="$ENV_AUTH" "$BACKEND/auth/scripts/seed-example-data.mjs"
node --env-file="$ENV_AUTH" "$BACKEND/auth/scripts/seed-permissions.js"

echo ""
echo "==> staff — indexes + example profiles"
node --env-file="$ENV_STAFF" "$BACKEND/service/staff/scripts/init-db.mjs"
node --env-file="$ENV_STAFF" "$BACKEND/service/staff/scripts/seed-example-data.mjs"

echo ""
echo "==> smart-report — indexes + example reports"
node --env-file="$ENV_SMART" "$BACKEND/service/smart-report/scripts/init-db.mjs"
node --env-file="$ENV_SMART" "$BACKEND/service/smart-report/scripts/seed-example-data.mjs"

echo ""
echo "==> agent-invoice — indexes + example agent/fees/invoice"
node --env-file="$ENV_INVOICE" "$BACKEND/service/agent-invoice/scripts/init-db.mjs"
node --env-file="$ENV_INVOICE" "$BACKEND/service/agent-invoice/scripts/seed-example-data.mjs"

echo ""
echo "==> branch-report — minimal gpp_777ww marketing data"
node --env-file="$ENV_BRANCH" "$BACKEND/service/branch-report/scripts/seed-example-data.mjs"

echo ""
echo "✓ staging-seed-all complete"
echo "  login: \${ADMIN_USERNAME:-platform_admin} / set ADMIN_PASSWORD in auth/.env.staging"
