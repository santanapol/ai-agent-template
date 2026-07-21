#!/usr/bin/env bash
# Copy local skills into .cursor/skills/ (survives upstream sync --delete).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$SCRIPT_DIR/local-skills"
DEST="$ROOT/.cursor/skills"

usage() {
  cat <<'EOF'
Usage: ./harness/scripts/agent/sync-local-agent-skills.sh

Copies harness/scripts/agent/local-skills/<name>/ → .cursor/skills/<name>/

Run after editing local skills, or automatically at the end of sync-agent-skills.sh.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -d "$SRC" ]]; then
  echo "No harness/scripts/agent/local-skills/ — nothing to install"
  exit 0
fi

shopt -s nullglob
found=0

for skill_dir in "$SRC"/*/; do
  [[ -d "$skill_dir" ]] || continue
  name="$(basename "$skill_dir")"
  if [[ ! -f "$skill_dir/SKILL.md" ]]; then
    echo "skip $name (no SKILL.md)" >&2
    continue
  fi
  mkdir -p "$DEST"
  rsync -a "$skill_dir" "$DEST/$name/"
  echo "  $name → .cursor/skills/$name/"
  found=1
done

if [[ "$found" -eq 0 ]]; then
  echo "No local skills with SKILL.md found in $SRC"
  exit 0
fi

echo "Local agent skills installed."
