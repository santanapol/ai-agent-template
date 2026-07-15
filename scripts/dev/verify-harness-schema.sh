#!/usr/bin/env bash
# Read-only: registry + prod baseline validator parity + index parity on harness DBs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BASELINE="$ROOT/docs/audit/prod-schema-baseline-2026-07-15.json"

echo "==> verify-validators (registry)"
node "$ROOT/scripts/ops/verify-validators.mjs" --harness

echo ""
echo "==> verify-validators (prod baseline parity)"
node "$ROOT/scripts/ops/verify-validators.mjs" --baseline="$BASELINE" --harness

echo ""
echo "==> verify-indexes"
node "$ROOT/scripts/ops/verify-indexes.mjs" --baseline="$BASELINE" --harness

echo ""
echo "✓ harness schema verify passed"
