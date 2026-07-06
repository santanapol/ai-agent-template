#!/usr/bin/env bash
# Sync agent-skills from upstream, then append Related Coding Standards to commands.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDARDS_SRC="$SCRIPT_DIR/agent-skills-standards"
CURSOR="$ROOT/.cursor"
REFS="$ROOT/references"

usage() {
  cat <<'EOF'
Usage: ./scripts/sync-agent-skills.sh [UPSTREAM_PATH]

1. Syncs upstream skills/, agents/, references/
2. Converts .claude/commands/ → .cursor/commands/ (English, from upstream)
3. Appends Related Coding Standards from scripts/agent-skills-standards/<command>.md
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

adapt_upstream_command_body() {
  sed -E \
    -e 's|Invoke the agent-skills:([a-z0-9-]+) skill\.?|Read and follow **\1** (`.cursor/skills/\1/SKILL.md`) completely.|g' \
    -e 's|Invoke the agent-skills:([a-z0-9-]+) skill alongside agent-skills:([a-z0-9-]+)\.|Read and follow **\1** (`.cursor/skills/\1/SKILL.md`) and **\2** (`.cursor/skills/\2/SKILL.md`) completely.|g' \
    -e 's|follow agent-skills:([a-z0-9-]+)|follow **\1** (`.cursor/skills/\1/SKILL.md`)|g' \
    -e 's|invoke agent-skills:([a-z0-9-]+)|follow **\1** (`.cursor/skills/\1/SKILL.md`)|g'
}

append_coding_standards() {
  local cmd="$1"
  local dest="$2"
  local frag="$STANDARDS_SRC/${cmd}.md"
  if [[ ! -f "$frag" || ! -s "$frag" ]]; then
    return 1
  fi
  printf '\n' >>"$dest"
  python3 - "$STANDARDS_SRC" "$frag" <<'PY' >>"$dest"
import sys
from pathlib import Path

std_dir = Path(sys.argv[1])
frag = Path(sys.argv[2])

def expand(path: Path, seen: set[Path]) -> str:
    if path in seen:
        raise SystemExit(f"circular @include: {path}")
    seen.add(path)
    out: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("@include "):
            inc = std_dir / line.strip().removeprefix("@include ").strip()
            if not inc.exists():
                raise SystemExit(f"missing include: {inc}")
            out.append(expand(inc, seen))
        else:
            out.append(line)
    return "\n".join(out).strip()

print(expand(frag, set()))
PY
  return 0
}

sync_commands() {
  local up name dest cmd desc
  mkdir -p "$CURSOR/commands"
  echo "Syncing commands (upstream + Related Coding Standards)..."

  for up in "$UPSTREAM/.claude/commands/"*.md; do
    [[ -f "$up" ]] || continue
    name="$(basename "$up")"
    dest="$CURSOR/commands/$name"
    cmd="${name%.md}"
    desc="$(awk '/^description:/{sub(/^description: /,""); print; exit}' "$up")"

    {
      echo "---"
      echo "name: $cmd"
      echo "description: $desc"
      echo "disable-model-invocation: true"
      echo "---"
      echo ""
      awk 'BEGIN{fm=1} fm && /^---$/{c++; if(c==2){fm=0; next}} !fm' "$up" | adapt_upstream_command_body
    } >"$dest"

    if append_coding_standards "$cmd" "$dest"; then
      echo "  $name (+ agent-skills-standards/$cmd.md)"
    else
      echo "  $name"
    fi
  done

  # code-build alias: same body as build + same standards
  if [[ -f "$CURSOR/commands/build.md" ]]; then
    cp "$CURSOR/commands/build.md" "$CURSOR/commands/code-build.md"
    sed -i 's/^name: build$/name: code-build/' "$CURSOR/commands/code-build.md"
    echo "  code-build.md (alias of build)"
  fi
}

bootstrap_cursor_meta() {
  local sha="$1"
  mkdir -p "$CURSOR/rules"

  cat >"$CURSOR/rules/agent-skills.mdc" <<'MDC'
---
description: Agent Skills lifecycle — map user intent to skills and slash commands. Use when starting work or choosing a workflow phase.
alwaysApply: true
---

# Agent Skills orchestration

This repo ships [agent-skills](https://github.com/addyosmani/agent-skills) for Cursor. **Do not improvise workflows** when a matching skill exists — read the skill's `SKILL.md` and follow it completely.

## Slash commands (manual invoke)

| Phase | Command | Underlying skill(s) |
|-------|---------|---------------------|
| Define | `/spec` | spec-driven-development |
| Plan | `/plan` | planning-and-task-breakdown |
| Build | `/build` or `/code-build` | incremental-implementation + test-driven-development |
| Verify | `/test` | test-driven-development |
| Review | `/review` | code-review-and-quality |
| Web perf | `/webperf` | performance-optimization + web-performance-auditor |
| Simplify | `/code-simplify` | code-simplification |
| Ship | `/ship` | shipping-and-launch + parallel personas |

## Intent → skill (auto)

- Vague ask → `interview-me` or `idea-refine`
- New feature → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` + `test-driven-development`
- Bug / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactor for clarity → `code-simplification`
- API design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Session start / which skill? → `using-agent-skills`

## Subagents (`.cursor/agents/`)

- `code-reviewer`, `security-auditor`, `test-engineer` — invoke directly or via `/ship` fan-out
- `web-performance-auditor` — invoke via `/webperf`
- Personas do not call other personas; only the user or `/ship` orchestrates

## References

- Skills: `.cursor/skills/<name>/SKILL.md`
- Checklists: `references/`
- Command standards: `scripts/agent-skills-standards/`
- Team guide: `.cursor/USAGE.md`
- Vendor pin: `.cursor/VENDOR.md`
MDC

  cat >"$CURSOR/VENDOR.md" <<VENDOR
# agent-skills vendor pin

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | \`$sha\` |
| Synced | $(date +%Y-%m-%d) |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| \`scripts/agent-skills-standards/\` | Related Coding Standards per command |
| \`.cursor/commands/\` | Generated — upstream + standards |
| \`.cursor/rules/agent-skills.mdc\` | Orchestration (regenerated each sync) |

## Sync

\`\`\`bash
./scripts/sync-agent-skills.sh
\`\`\`
VENDOR

  cp -f "$SCRIPT_DIR/agent-skills-standards/README.md" "$CURSOR/commands/README.md" 2>/dev/null || true

  cat >"$CURSOR/commands/README.md" <<'CMDREADME'
# Commands index (Cursor)

**Generated** by [`../../scripts/sync-agent-skills.sh`](../../scripts/sync-agent-skills.sh) — upstream English + [agent-skills-standards](../../scripts/agent-skills-standards/).

| Command | Standards |
|---------|-----------|
| `/spec` | [spec.md](../../scripts/agent-skills-standards/spec.md) |
| `/plan` | [plan.md](../../scripts/agent-skills-standards/plan.md) |
| `/build` | [build.md](../../scripts/agent-skills-standards/build.md) |
| `/code-build` | alias of `/build` |
| `/test` | [test.md](../../scripts/agent-skills-standards/test.md) |
| `/review` | [review.md](../../scripts/agent-skills-standards/review.md) |
| `/webperf` | [webperf.md](../../scripts/agent-skills-standards/webperf.md) |
| `/code-simplify` | [code-simplify.md](../../scripts/agent-skills-standards/code-simplify.md) |
| `/ship` | [ship.md](../../scripts/agent-skills-standards/ship.md) |
CMDREADME

  cat >"$CURSOR/README.md" <<'README'
# Cursor configuration (agent-skills)

Generated by `./scripts/sync-agent-skills.sh` from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).

| Path | Role |
|------|------|
| `commands/` | Slash commands (upstream + project standards) |
| `skills/` | Lifecycle skills |
| `agents/` | Specialist subagents |
| `rules/` | Orchestration index |

See [USAGE.md](./USAGE.md) and [VENDOR.md](./VENDOR.md).
README

  cat >"$CURSOR/USAGE.md" <<'USAGE'
# Using agent-skills in Cursor

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `scripts/agent-skills-standards/` |
| Commands (generated) | `.cursor/commands/` |
| Skills | `.cursor/skills/` |
| Agents | `.cursor/agents/` |
| References | `references/` |

## Sync

```bash
./scripts/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship`
USAGE

  echo "Bootstrapped .cursor/rules, VENDOR.md, README"
}

# --- main ---

if [[ -z "$UPSTREAM" ]]; then
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  git clone --depth 1 https://github.com/addyosmani/agent-skills.git "$TMP/agent-skills"
  UPSTREAM="$TMP/agent-skills"
  echo "Cloned upstream to $UPSTREAM"
fi

if [[ ! -d "$UPSTREAM/skills" ]]; then
  echo "error: $UPSTREAM does not look like agent-skills (missing skills/)" >&2
  exit 1
fi

echo "Syncing skills..."
mkdir -p "$CURSOR/skills"
for skill_dir in "$UPSTREAM"/skills/*/; do
  name="$(basename "$skill_dir")"
  rsync -a --delete "$skill_dir" "$CURSOR/skills/$name/"
done

echo "Syncing agents..."
mkdir -p "$CURSOR/agents"
rsync -a "$UPSTREAM/agents/" "$CURSOR/agents/"

echo "Syncing references..."
mkdir -p "$REFS"
rsync -a "$UPSTREAM/references/" "$REFS/"

sync_commands

SHA="$(git -C "$UPSTREAM" rev-parse HEAD 2>/dev/null || echo unknown)"
bootstrap_cursor_meta "$SHA"

echo ""
echo "Done. Upstream commit: $SHA"
echo "Edit standards only: scripts/agent-skills-standards/<command>.md"
