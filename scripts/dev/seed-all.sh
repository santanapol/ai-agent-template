#!/usr/bin/env bash
# Seed example data for every harness service (uses `<service>/.env.harness`).
# Idempotent — safe to re-run after dev-up or on its own.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-lib.sh
source "$SCRIPT_DIR/dev-lib.sh"

if [[ ! -f "$(dev_harness_env backend/auth)" ]]; then
  echo "Missing harness env — run ./scripts/dev-up.sh first (or dev-generate-env.mjs)" >&2
  exit 1
fi

ENV_AUTH="$(dev_harness_env backend/auth)"
ENV_STAFF="$(dev_harness_env backend/service/staff)"
ENV_DEMO="$(dev_harness_env backend/service/demo-service)"
ENV_SMART="$(dev_harness_env backend/service/smart-report)"
ENV_INVOICE="$(dev_harness_env backend/service/agent-invoice)"
ENV_BRANCH="$(dev_harness_env backend/service/branch-report)"

for f in "$ENV_AUTH" "$ENV_STAFF" "$ENV_DEMO" "$ENV_SMART" "$ENV_INVOICE" "$ENV_BRANCH"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing harness env: $f — run ./scripts/dev-up.sh first" >&2
    exit 1
  fi
done

echo "Harness seed-all (PORT_OFFSET=$PORT_OFFSET)"

echo ""
echo "==> auth — example users + menu permissions"
node --env-file="$ENV_AUTH" "$ROOT/backend/auth/scripts/seed-example-data.mjs"
node --env-file="$ENV_AUTH" "$ROOT/backend/auth/scripts/seed-permissions.js"

echo ""
echo "==> staff — indexes + example profiles"
node --env-file="$ENV_STAFF" "$ROOT/backend/service/staff/scripts/init-db.mjs"
node --env-file="$ENV_STAFF" "$ROOT/backend/service/staff/scripts/seed-example-data.mjs"

echo ""
echo "==> demo-service — indexes + example items"
node --env-file="$ENV_DEMO" "$ROOT/backend/service/demo-service/scripts/init-db.mjs"
node --env-file="$ENV_DEMO" "$ROOT/backend/service/demo-service/scripts/seed-example-data.mjs"

echo ""
echo "==> smart-report — indexes + example reports"
node --env-file="$ENV_SMART" "$ROOT/backend/service/smart-report/scripts/init-db.mjs"
node --env-file="$ENV_SMART" "$ROOT/backend/service/smart-report/scripts/seed-example-data.mjs"

echo ""
echo "==> agent-invoice — indexes + example agent/fees/invoice"
node --env-file="$ENV_INVOICE" "$ROOT/backend/service/agent-invoice/scripts/init-db.mjs"
node --env-file="$ENV_INVOICE" "$ROOT/backend/service/agent-invoice/scripts/seed-example-data.mjs"

echo ""
echo "==> branch-report — minimal gpp_777ww marketing data"
node --env-file="$ENV_BRANCH" "$ROOT/backend/service/branch-report/scripts/seed-example-data.mjs"

echo ""
echo "==> schema verify (validators + indexes)"
"$SCRIPT_DIR/verify-harness-schema.sh"

echo ""
echo "✓ seed-all complete"
dev_load_ports
echo "  login: ${SMOKE_USERNAME} / ${SMOKE_PASSWORD}"
