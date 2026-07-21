#!/usr/bin/env bash
# Set code layout profile: code-base (greenfield) or root (brownfield).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONFIG="$ROOT/harness.config.yaml"

usage() {
  cat <<'EOF'
Usage: ./harness/scripts/agent/set-code-layout.sh <code-base|root>

Profiles:
  code-base   Greenfield — application code under code-base/backend and code-base/frontend (default)
  root        Brownfield — application code at repo root (backend/, frontend/, etc.)

Updates harness.config.yaml only. Does not move application code.
See harness/knowledge/harness/adopt.md for adoption steps.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || $# -ne 1 ]]; then
  usage
  exit "${1:-}" == "-h" || "${1:-}" == "--help" ? 0 : 1
fi

LAYOUT="$1"
case "$LAYOUT" in
  code-base)
    BACKEND="code-base/backend"
    FRONTEND="code-base/frontend"
    ;;
  root)
    BACKEND="backend"
    FRONTEND="frontend"
    ;;
  *)
    echo "error: layout must be code-base or root" >&2
    usage >&2
    exit 1
    ;;
esac

cat >"$CONFIG" <<EOF
# Code layout for this repository.
# Switch: ./harness/scripts/agent/set-code-layout.sh code-base|root
# Guide: harness/knowledge/harness/adopt.md

version: 1
layout: $LAYOUT # code-base (greenfield) | root (existing codebase at repo root)

code:
  backend: $BACKEND
  frontend: $FRONTEND
EOF

echo "Updated $CONFIG → layout: $LAYOUT"
echo "  backend:  $BACKEND"
echo "  frontend: $FRONTEND"
echo ""
if [[ "$LAYOUT" == "root" ]]; then
  echo "Next: keep your existing backend/ and frontend/ at repo root."
  echo "      Run: node harness/scripts/ci/docs-lint.mjs"
else
  echo "Next: add application code under code-base/backend and code-base/frontend"
  echo "      Run: node harness/scripts/ci/docs-lint.mjs"
fi
