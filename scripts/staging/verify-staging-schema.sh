#!/usr/bin/env bash
# Read-only: validator registry + prod baseline parity on staging DBs (no verify-indexes).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BASELINE="$ROOT/docs/audit/prod-schema-baseline-2026-07-15.json"

echo "==> verify-validators (registry)"
node "$ROOT/scripts/ops/verify-validators.mjs" --staging

echo ""
echo "==> verify-validators (prod baseline parity)"
node "$ROOT/scripts/ops/verify-validators.mjs" --baseline="$BASELINE" --staging

echo ""
echo "✓ staging schema verify passed"
