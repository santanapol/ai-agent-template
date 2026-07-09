#!/usr/bin/env bash
# Fresh local staging MongoDB: drop DBs → seed-all (indexes + example data + validators).
# Run on staging server after docker compose is up.
#
#   bash scripts/staging/staging-init-all.sh
#   bash scripts/staging/staging-init-all.sh --no-reset   # re-seed without drop
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RESET=1
for arg in "$@"; do
  if [[ "$arg" == "--no-reset" ]]; then
    RESET=0
  fi
done

if [[ "$RESET" -eq 1 ]]; then
  bash "$SCRIPT_DIR/staging-reset-local-dbs.sh"
fi

bash "$SCRIPT_DIR/staging-verify-env.sh"
bash "$SCRIPT_DIR/staging-seed-all.sh"

echo ""
echo "==> pm2 reload (pick up zero-platform DATABASE_URI)"
if [[ -f "$SCRIPT_DIR/../../backend/ecosystem.staging.config.js" ]]; then
  (cd "$SCRIPT_DIR/../../backend" && pm2 reload ecosystem.staging.config.js)
  echo "  ✓ pm2 reloaded"
else
  echo "  skip — ecosystem.staging.config.js not found (not on staging server?)"
fi

echo ""
echo "✓ staging-init-all complete"
echo "  schema verify: bash scripts/staging/verify-staging-schema.sh"
echo "  smoke: SMOKE_PASSWORD='…' bash scripts/staging/smoke-staging.sh"
