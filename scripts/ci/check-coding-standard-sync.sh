#!/usr/bin/env bash
# Diff vendored coding-standard/ against org upstream (sibling agent-skill tree).
# Usage: ./scripts/ci/check-coding-standard-sync.sh [upstream_path]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# Org upstream lives at agent-skill workspace root (sibling of code-base/), not Sandbox/.
UPSTREAM="${1:-$(cd "$ROOT/../.." && pwd)/coding-standard}"

if [[ ! -d "$UPSTREAM" ]]; then
  echo "Upstream not found: $UPSTREAM" >&2
  echo "Usage: $0 /path/to/org/coding-standard" >&2
  exit 1
fi

echo "Vendored: $ROOT/coding-standard"
echo "Upstream: $UPSTREAM"
echo ""

if diff -qr "$UPSTREAM" "$ROOT/coding-standard" --exclude=README.md 2>/dev/null; then
  echo "✓ coding-standard in sync (excluding README vendored note)"
  exit 0
fi

echo "✗ drift detected — sync from upstream per coding-standard/README.md" >&2
exit 1
