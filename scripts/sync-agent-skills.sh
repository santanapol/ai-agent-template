#!/usr/bin/env bash
# Sync agent-skills from upstream into both .cursor/ and .claude/, then append Related Coding Standards to commands.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDARDS_SRC="$SCRIPT_DIR/agent-skills-standards"
CURSOR="$ROOT/.cursor"
CLAUDE="$ROOT/.claude"
REFS="$ROOT/references"

usage() {
  cat <<'EOF'
Usage: ./scripts/sync-agent-skills.sh [UPSTREAM_PATH]

1. Syncs upstream skills/, agents/, references/ into .cursor/ and .claude/
2. Converts .claude/commands/ (upstream) → .cursor/commands/ (Cursor format)
   and → .claude/commands/ (native format, "agent-skills:" prefix stripped)
3. Appends Related Coding Standards from scripts/agent-skills-standards/<command>.md
4. Regenerates root CLAUDE.md and .cursor/rules/agent-skills.mdc (orchestration)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

# $1: skills dir to reference in the rewritten body (e.g. .cursor/skills or .claude/skills)
adapt_upstream_command_body() {
  local skills_dir="$1"
  sed -E \
    -e "s|Invoke the agent-skills:([a-z0-9-]+) skill\.?|Read and follow **\1** (\`${skills_dir}/\1/SKILL.md\`) completely.|g" \
    -e "s|Invoke the agent-skills:([a-z0-9-]+) skill alongside agent-skills:([a-z0-9-]+)\.|Read and follow **\1** (\`${skills_dir}/\1/SKILL.md\`) and **\2** (\`${skills_dir}/\2/SKILL.md\`) completely.|g" \
    -e "s|follow agent-skills:([a-z0-9-]+)|follow **\1** (\`${skills_dir}/\1/SKILL.md\`)|g" \
    -e "s|invoke agent-skills:([a-z0-9-]+)|follow **\1** (\`${skills_dir}/\1/SKILL.md\`)|g"
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
  echo "Syncing commands (Cursor format)..."

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
      awk 'BEGIN{fm=1} fm && /^---$/{c++; if(c==2){fm=0; next}} !fm' "$up" | adapt_upstream_command_body ".cursor/skills"
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

sync_claude_commands() {
  local up name dest cmd
  mkdir -p "$CLAUDE/commands"
  echo "Syncing commands (Claude native format)..."

  for up in "$UPSTREAM/.claude/commands/"*.md; do
    [[ -f "$up" ]] || continue
    name="$(basename "$up")"
    dest="$CLAUDE/commands/$name"
    cmd="${name%.md}"

    # Upstream .claude/commands/*.md is already native Claude Code format.
    # Only fix: strip the "agent-skills:" plugin namespace — we vendor skills
    # directly under .claude/skills/<name>/, unprefixed, not via plugin install.
    sed -E 's/agent-skills:([a-z0-9-]+)/\1/g' "$up" >"$dest"

    if append_coding_standards "$cmd" "$dest"; then
      echo "  $name (+ agent-skills-standards/$cmd.md)"
    else
      echo "  $name"
    fi
  done

  # code-build alias: same body as build + same standards
  if [[ -f "$CLAUDE/commands/build.md" ]]; then
    cp "$CLAUDE/commands/build.md" "$CLAUDE/commands/code-build.md"
    echo "  code-build.md (alias of build)"
  fi
}

sync_local_commands() {
  local src="$SCRIPT_DIR/local-commands"
  if [[ ! -d "$src" ]]; then
    return 0
  fi
  echo "Syncing local commands (zero-platform)..."
  mkdir -p "$CLAUDE/commands"
  for cmd in "$src"/*.md; do
    [[ -f "$cmd" ]] || continue
    cp -f "$cmd" "$CURSOR/commands/$(basename "$cmd")"
    sed 's|\.cursor/skills/|.claude/skills/|g' "$cmd" >"$CLAUDE/commands/$(basename "$cmd")"
    echo "  $(basename "$cmd") (local)"
  done
}

sync_local_agent_skills() {
  if [[ -x "$SCRIPT_DIR/sync-local-agent-skills.sh" ]]; then
    echo "Syncing local agent skills (zero-platform)..."
    "$SCRIPT_DIR/sync-local-agent-skills.sh"
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
| Release | `/release` | release-notes-and-handoff |
| GC | `/gc` | code-simplification + golden principles |

## Agent map

Start at repo root [AGENTS.md](../../AGENTS.md) for document map. **How we work:** [harness-engineering/README.md](../../harness-engineering/README.md).

## Intent → skill (auto)

- Vague ask → `interview-me` or `idea-refine`
- New feature → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` + `test-driven-development`
- Bug / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactor for clarity → `code-simplification`
- API design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Session start / which skill? → `using-agent-skills`
- After `/ship` GO → `/release` → `release-notes-and-handoff`

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
| \`scripts/local-skills/\` | zero-platform skills (restored after upstream sync, into .cursor/ and .claude/) |
| \`scripts/local-commands/\` | Local slash commands (\`/gc\`, \`/release\`) |
| \`scripts/sync-local-agent-skills.sh\` | Copy local-skills → \`.cursor/skills/\` and \`.claude/skills/\` |
| \`.cursor/commands/\` | Generated — upstream + standards + local |
| \`.cursor/rules/agent-skills.mdc\` | Orchestration (regenerated each sync) |

See also \`.claude/VENDOR.md\` for the Claude Code counterpart.

## Sync

\`\`\`bash
./scripts/sync-agent-skills.sh
\`\`\`
VENDOR

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
| `/release` | local — [release.md](../../scripts/local-commands/release.md) |
| `/gc` | local — [gc.md](../../scripts/local-commands/gc.md) |
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

See [USAGE.md](./USAGE.md) and [VENDOR.md](./VENDOR.md). Claude Code gets the same content under [`../.claude/`](../.claude/).
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

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
USAGE

  echo "Bootstrapped .cursor/rules, VENDOR.md, README"
}

bootstrap_claude_meta() {
  local sha="$1"

  cat >"$CLAUDE/VENDOR.md" <<VENDOR
# agent-skills vendor pin (Claude Code)

| Field | Value |
|-------|-------|
| Upstream | https://github.com/addyosmani/agent-skills |
| Commit | \`$sha\` |
| Synced | $(date +%Y-%m-%d) |
| Skills | 24 (23 lifecycle + using-agent-skills) |
| Commands | 8 + code-build alias |
| Agents | 4 |

Vendored directly (not installed as a Claude Code plugin) so the repo stays self-contained
and pinned to one commit — same reasoning as \`.cursor/VENDOR.md\`. Command bodies have the
\`agent-skills:\` plugin-namespace prefix stripped since skills live unprefixed under
\`.claude/skills/<name>/SKILL.md\`.

## Local overrides (not overwritten by sync)

| Path | Role |
|------|------|
| \`scripts/agent-skills-standards/\` | Related Coding Standards per command |
| \`scripts/local-skills/\` | zero-platform skills (restored after upstream sync, into .cursor/ and .claude/) |
| \`scripts/local-commands/\` | Local slash commands (\`/gc\`, \`/release\`) |
| \`scripts/sync-local-agent-skills.sh\` | Copy local-skills → \`.cursor/skills/\` and \`.claude/skills/\` |
| \`.claude/commands/\` | Generated — upstream + standards + local (index: \`.claude/COMMANDS.md\`, kept outside this dir so it isn't picked up as a phantom command) |
| \`.claude/settings.local.json\` | Per-developer permissions — never touched by sync |

See also \`.cursor/VENDOR.md\` for the Cursor counterpart.

## Sync

\`\`\`bash
./scripts/sync-agent-skills.sh
\`\`\`
VENDOR

  # NOTE: unlike .cursor/commands/, Claude Code scans every *.md under .claude/commands/
  # as a slash command — a plain README.md there gets registered as a phantom command.
  # Keep the index one level up, at .claude/COMMANDS.md.
  cat >"$CLAUDE/COMMANDS.md" <<'CMDREADME'
# Commands index (Claude Code)

**Generated** by [`../scripts/sync-agent-skills.sh`](../scripts/sync-agent-skills.sh) — upstream native format + [agent-skills-standards](../scripts/agent-skills-standards/).

| Command | Standards |
|---------|-----------|
| `/spec` | [spec.md](../scripts/agent-skills-standards/spec.md) |
| `/plan` | [plan.md](../scripts/agent-skills-standards/plan.md) |
| `/build` | [build.md](../scripts/agent-skills-standards/build.md) |
| `/code-build` | alias of `/build` |
| `/test` | [test.md](../scripts/agent-skills-standards/test.md) |
| `/review` | [review.md](../scripts/agent-skills-standards/review.md) |
| `/webperf` | [webperf.md](../scripts/agent-skills-standards/webperf.md) |
| `/code-simplify` | [code-simplify.md](../scripts/agent-skills-standards/code-simplify.md) |
| `/ship` | [ship.md](../scripts/agent-skills-standards/ship.md) |
| `/release` | local — [release.md](../scripts/local-commands/release.md) |
| `/gc` | local — [gc.md](../scripts/local-commands/gc.md) |
CMDREADME

  cat >"$CLAUDE/README.md" <<'README'
# Claude Code configuration (agent-skills)

Generated by `./scripts/sync-agent-skills.sh` from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).

| Path | Role |
|------|------|
| `commands/` | Slash commands (upstream native format + project standards) — index: [COMMANDS.md](./COMMANDS.md) |
| `skills/` | Lifecycle skills (auto-discovered by name, unprefixed) |
| `agents/` | Specialist subagents |

Vendored, not plugin-installed — see [VENDOR.md](./VENDOR.md) for why. See [USAGE.md](./USAGE.md).
The same content is also generated for Cursor under [`../.cursor/`](../.cursor/).
README

  cat >"$CLAUDE/USAGE.md" <<'USAGE'
# Using agent-skills in Claude Code

## Layout

| Layer | Location |
|-------|----------|
| Standards (edit) | `scripts/agent-skills-standards/` |
| Commands (generated) | `.claude/commands/` |
| Skills | `.claude/skills/` |
| Agents | `.claude/agents/` |
| References | `references/` |

Skills are discovered automatically by name (the `name:` field in each `SKILL.md`) —
no `agent-skills:` prefix, since these are vendored in-repo rather than installed
as a Claude Code plugin.

## Sync

```bash
./scripts/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
USAGE

  cat >"$ROOT/CLAUDE.md" <<'ROOTCLAUDE'
# CLAUDE.md

Auto-loaded by Claude Code at the start of every session in this repo. This is the
orchestration layer — which skill/command to reach for. **Repo map (start here):** [AGENTS.md](AGENTS.md).

This repo vendors [agent-skills](https://github.com/addyosmani/agent-skills). **Do not
improvise workflows** when a matching skill exists — read the skill's `SKILL.md`
(`.claude/skills/<name>/SKILL.md`) and follow it completely.

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
| Release | `/release` | release-notes-and-handoff |
| GC | `/gc` | code-simplification + golden principles |

## Intent → skill (auto)

- Vague ask → `interview-me` or `idea-refine`
- New feature → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` + `test-driven-development`
- Bug / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactor for clarity → `code-simplification`
- API design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Session start / which skill? → `using-agent-skills`
- After `/ship` GO → `/release` → `release-notes-and-handoff`

## Subagents (`.claude/agents/`)

- `code-reviewer`, `security-auditor`, `test-engineer` — invoke directly or via `/ship` fan-out
- `web-performance-auditor` — invoke via `/webperf`
- Personas do not call other personas; only the user or `/ship` orchestrates

## References

- Skills: `.claude/skills/<name>/SKILL.md`
- Checklists: `references/`
- Command standards: `scripts/agent-skills-standards/`
- Team guide: `.claude/USAGE.md`
- Vendor pin: `.claude/VENDOR.md`
- How we work: [harness-engineering/README.md](harness-engineering/README.md)

Cursor gets the same orchestration via [`.cursor/rules/agent-skills.mdc`](.cursor/rules/agent-skills.mdc).
ROOTCLAUDE

  echo "Bootstrapped .claude/, VENDOR.md, README, root CLAUDE.md"
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

echo "Syncing skills (Cursor)..."
mkdir -p "$CURSOR/skills"
for skill_dir in "$UPSTREAM"/skills/*/; do
  name="$(basename "$skill_dir")"
  rsync -a --delete "$skill_dir" "$CURSOR/skills/$name/"
done

echo "Syncing skills (Claude)..."
mkdir -p "$CLAUDE/skills"
for skill_dir in "$UPSTREAM"/skills/*/; do
  name="$(basename "$skill_dir")"
  rsync -a --delete "$skill_dir" "$CLAUDE/skills/$name/"
done

echo "Syncing agents..."
mkdir -p "$CURSOR/agents" "$CLAUDE/agents"
rsync -a "$UPSTREAM/agents/" "$CURSOR/agents/"
rsync -a "$UPSTREAM/agents/" "$CLAUDE/agents/"

echo "Syncing references..."
mkdir -p "$REFS"
rsync -a "$UPSTREAM/references/" "$REFS/"

sync_commands
sync_claude_commands
sync_local_commands
sync_local_agent_skills

SHA="$(git -C "$UPSTREAM" rev-parse HEAD 2>/dev/null || echo unknown)"
bootstrap_cursor_meta "$SHA"
bootstrap_claude_meta "$SHA"

echo ""
echo "Done. Upstream commit: $SHA"
echo "Edit standards only: scripts/agent-skills-standards/<command>.md"
