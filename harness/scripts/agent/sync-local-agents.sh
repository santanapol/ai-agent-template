#!/usr/bin/env bash
# Copy local agents into .cursor/agents/ (survives upstream agents rsync).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$SCRIPT_DIR/local-agents"
DEST="$ROOT/.cursor/agents"

usage() {
  cat <<'EOF'
Usage: ./harness/scripts/agent/sync-local-agents.sh

Copies harness/scripts/agent/local-agents/*.md → .cursor/agents/

Run after editing local agents, or automatically after upstream agents rsync
in sync-agent-skills.sh.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -d "$SRC" ]]; then
  echo "No harness/scripts/agent/local-agents/ — nothing to install"
  exit 0
fi

shopt -s nullglob
found=0
mkdir -p "$DEST"

for agent in "$SRC"/*.md; do
  [[ -f "$agent" ]] || continue
  name="$(basename "$agent")"
  cp -f "$agent" "$DEST/$name"
  echo "  $name → .cursor/agents/$name"
  found=1
done

if [[ "$found" -eq 0 ]]; then
  echo "No local agent markdown files found in $SRC"
  exit 0
fi

echo "Local agents installed."
