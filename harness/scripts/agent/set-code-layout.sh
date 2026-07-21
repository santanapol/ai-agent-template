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

Updates harness.config.yaml layout + code paths. Preserves optional_skills.* if present.
Does not move application code.
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

# Preserve optional_skills.vercel_react_ui from existing config (default false)
VERCEL_REACT_UI=false
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*vercel_react_ui:[[:space:]]*true' "$CONFIG"; then
  VERCEL_REACT_UI=true
fi

cat >"$CONFIG" <<EOF
# Code layout for this repository.
# Switch: ./harness/scripts/agent/set-code-layout.sh code-base|root
# Guide: harness/knowledge/harness/adopt.md

version: 1
layout: $LAYOUT # code-base (greenfield) | root (existing codebase at repo root)

code:
  backend: $BACKEND
  frontend: $FRONTEND

optional_skills:
  # Vercel React/Next.js + Design/UI — https://vercel.com/docs/agent-resources/skills
  # Install: ./harness/scripts/agent/install-optional-skills.sh
  vercel_react_ui: $VERCEL_REACT_UI
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
