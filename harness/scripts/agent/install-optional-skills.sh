#!/usr/bin/env bash
# Install optional third-party skills (Vercel React/Next + Design/UI, etc.)
# Driven by harness.config.yaml → optional_skills.vercel_react_ui
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONFIG="$ROOT/harness.config.yaml"
CURSOR_SKILLS="$ROOT/.cursor/skills"
AGENTS_SKILLS="$ROOT/.agents/skills"

usage() {
  cat <<'EOF'
Usage: ./harness/scripts/agent/install-optional-skills.sh [--force]

Reads harness.config.yaml optional_skills flags and installs skills for Cursor.

  vercel_react_ui: true
    → vercel-react-best-practices (React and Next.js)
    → web-design-guidelines (Design and UI)
    from vercel-labs/agent-skills
    Docs: https://vercel.com/docs/agent-resources/skills

  --force   install even if flag is missing/false (used by /setup after approval)

The skills CLI may write under .agents/skills/; this script also copies into
.cursor/skills/ so Cursor discovers them alongside synced agent-skills.
EOF
}

FORCE=0
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

enabled=0
if [[ -f "$CONFIG" ]] && grep -Eq '^[[:space:]]*vercel_react_ui:[[:space:]]*true' "$CONFIG"; then
  enabled=1
fi

if [[ "$FORCE" -eq 0 && "$enabled" -eq 0 ]]; then
  echo "optional_skills.vercel_react_ui not enabled — skip"
  exit 0
fi

echo "Installing Vercel React/Next.js + Design/UI skills (vercel-labs/agent-skills)..."
echo "  → vercel-react-best-practices"
echo "  → web-design-guidelines"
echo "  Docs: https://vercel.com/docs/agent-resources/skills#react-and-next.js"
echo "        https://vercel.com/docs/agent-resources/skills#design-and-ui"

cd "$ROOT"
npx --yes skills add vercel-labs/agent-skills \
  --skill vercel-react-best-practices \
  --skill web-design-guidelines \
  -a cursor \
  -y

mkdir -p "$CURSOR_SKILLS"
for name in vercel-react-best-practices web-design-guidelines; do
  src=""
  if [[ -d "$AGENTS_SKILLS/$name" ]]; then
    src="$AGENTS_SKILLS/$name"
  elif [[ -d "$CURSOR_SKILLS/$name" ]]; then
    src="$CURSOR_SKILLS/$name"
  fi
  if [[ -n "$src" && "$src" != "$CURSOR_SKILLS/$name" ]]; then
    echo "  Copy $name → .cursor/skills/"
    rm -rf "$CURSOR_SKILLS/$name"
    mkdir -p "$CURSOR_SKILLS/$name"
    # Prefer rsync; fall back to cp
    if command -v rsync >/dev/null 2>&1; then
      rsync -a "$src/" "$CURSOR_SKILLS/$name/"
    else
      cp -a "$src/." "$CURSOR_SKILLS/$name/"
    fi
  fi
  if [[ ! -f "$CURSOR_SKILLS/$name/SKILL.md" ]]; then
    echo "error: missing $CURSOR_SKILLS/$name/SKILL.md after install" >&2
    exit 1
  fi
  echo "  ✓ .cursor/skills/$name"
done

echo "Optional Vercel skills ready under .cursor/skills/"
