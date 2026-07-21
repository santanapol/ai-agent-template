#!/usr/bin/env bash
# Sync agent-skills from upstream into .cursor/ and harness/references/, then append Related Coding Standards to commands.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
UPSTREAM="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDARDS_SRC="$SCRIPT_DIR/agent-skills-standards"
CURSOR="$ROOT/.cursor"
REFS="$ROOT/harness/references"

usage() {
  cat <<'EOF'
Usage: ./harness/scripts/agent/sync-agent-skills.sh [UPSTREAM_PATH]

1. Syncs upstream skills/, agents/, references/ into .cursor/ and harness/references/
2. Converts .claude/commands/ (upstream) → .cursor/commands/ (Cursor format)
3. Appends Related Coding Standards from harness/scripts/agent/agent-skills-standards/<command>.md
4. Regenerates `.cursor/rules/agent-skills.mdc` (orchestration)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

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

  if [[ -f "$CURSOR/commands/build.md" ]]; then
    cp "$CURSOR/commands/build.md" "$CURSOR/commands/code-build.md"
    sed -i 's/^name: build$/name: code-build/' "$CURSOR/commands/code-build.md"
    echo "  code-build.md (alias of build)"
  fi
}

sync_local_commands() {
  local src="$SCRIPT_DIR/local-commands"
  if [[ ! -d "$src" ]]; then
    return 0
  fi
  echo "Syncing local commands (ai-agent-template)..."
  mkdir -p "$CURSOR/commands"
  for cmd in "$src"/*.md; do
    [[ -f "$cmd" ]] || continue
    cp -f "$cmd" "$CURSOR/commands/$(basename "$cmd")"
    echo "  $(basename "$cmd") (local)"
  done
  if [[ -f "$CURSOR/commands/build.md" ]]; then
    cp -f "$CURSOR/commands/build.md" "$CURSOR/commands/code-build.md"
    sed -i 's/^name: build$/name: code-build/' "$CURSOR/commands/code-build.md"
    echo "  code-build.md (alias of local build)"
  fi
}

patch_cursor_commands() {
  echo "Patching commands for ai-agent-template (Cursor-only)..."
  local f
  for f in "$CURSOR/commands/"*.md; do
    [[ -f "$f" ]] || continue
    # Relative links in harness/scripts/agent/{local-commands,agent-skills-standards}
    # use ../../../../ to reach repo root. After copy/append into .cursor/commands/,
    # only ../../ is needed — rewrite here so markdown links stay valid.
    sed -i \
      -e 's/Read CLAUDE\.md and study project conventions/Read [agent-skills.mdc](..\/rules\/agent-skills.mdc) and [AGENTS.md](..\/..\/AGENTS.md) for project conventions/g' \
      -e 's/Read CLAUDE\.md \/ project conventions/Read agent-skills.mdc and AGENTS.md for project conventions/g' \
      -e 's/\.claude\/agents\//.cursor\/agents\//g' \
      -e 's/ or `~\/\.claude\/agents\/`//g' \
      -e 's|](../../../../|](../../|g' \
      -e 's|](../../../harness/|](../../harness/|g' \
      -e 's|`harness/references/|`__HARNESS_REFS__/|g' \
      -e 's|`references/|`harness/references/|g' \
      -e 's|`__HARNESS_REFS__/|`harness/references/|g' \
      "$f"
  done
}

patch_cursor_skills() {
  echo "Patching skills for ai-agent-template (Cursor-only)..."
  local f
  while IFS= read -r -d '' f; do
    sed -i \
      -e 's/Rules Files (CLAUDE\.md, etc\.)/Rules Files (.cursor\/rules\/*.mdc, etc.)/g' \
      -e 's/\*\*CLAUDE\.md\*\* (for Claude Code):/**This repo (Cursor):** start with `.cursor\/rules\/agent-skills.mdc` and `AGENTS.md`. Example rules-file pattern:/g' \
      -e 's/Read CLAUDE\.md \/ project conventions/Read `.cursor\/rules\/agent-skills.mdc` and `AGENTS.md` for project conventions/g' \
      -e 's/checked against CLAUDE\.md or equivalent/checked against agent-skills.mdc \/ AGENTS.md or equivalent/g' \
      -e 's/\*\*CLAUDE\.md \/ rules files\*\*/**\`.cursor\/rules\` \/ AGENTS.md**/g' \
      -e 's/Rules files (CLAUDE\.md etc\.)/Rules files (agent-skills.mdc, AGENTS.md, etc.)/g' \
      -e 's|`references/|`harness/references/|g' \
      -e 's| see `references/| see `harness/references/|g' \
      "$f"
  done < <(find "$CURSOR/skills" -name 'SKILL.md' -print0 2>/dev/null)

  local agents_dir
  for agents_dir in "$CURSOR/agents" "$ROOT/harness/references"; do
    [[ -d "$agents_dir" ]] || continue
    while IFS= read -r -d '' f; do
      sed -i -e 's|`references/|`harness/references/|g' "$f"
    done < <(find "$agents_dir" -name '*.md' -print0 2>/dev/null)
  done

  local plan_skill="$CURSOR/skills/planning-and-task-breakdown/SKILL.md"
  if [[ -f "$plan_skill" ]]; then
    sed -i \
      -e 's/saved to `tasks\/plan\.md` and a task list saved to `tasks\/todo\.md`/saved to `docs\/exec-plans\/active\/<slug>.md` (one file with a ## Tasks section — see harness-planning-conventions)/g' \
      -e 's/Save the implementation plan to `tasks\/plan\.md`\./Save the implementation plan to `docs\/exec-plans\/active\/<slug>.md`./g' \
      -e 's/Save the checklist-style task list to `tasks\/todo\.md`\./Put tasks in `## Tasks` inside the same exec plan file — do not create `tasks\/todo.md`./g' \
      "$plan_skill"
  fi

  local spec_skill="$CURSOR/skills/spec-driven-development/SKILL.md"
  if [[ -f "$spec_skill" ]]; then
    sed -i \
      -e 's/Save the plan to `tasks\/plan\.md` and the task list to `tasks\/todo\.md`, per the `\/plan` command convention. Create `tasks\/` if it does not exist. Downstream commands (`\/build`, etc.) expect these paths./Save specs to `docs\/specs\/<slug>.md` (see harness-planning-conventions). Plans go to `docs\/exec-plans\/active\/<slug>.md` via `\/plan` — never `tasks\/` or repo-root `SPEC.md`./g' \
      "$spec_skill"
  fi
}

sync_local_agent_skills() {
  if [[ -x "$SCRIPT_DIR/sync-local-agent-skills.sh" ]]; then
    echo "Syncing local agent skills..."
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
| Define | `/spec` | harness-planning-conventions + spec-driven-development | `docs/specs/` |
| Plan | `/plan` | harness-planning-conventions + planning-and-task-breakdown | `docs/exec-plans/active/` |
| Build | `/build` or `/code-build` | incremental-implementation + test-driven-development |
| Verify | `/test` | test-driven-development |
| Review | `/review` | code-review-and-quality |
| Web perf | `/webperf` | performance-optimization + web-performance-auditor |
| Simplify | `/code-simplify` | code-simplification |
| Ship | `/ship` | shipping-and-launch + parallel personas |
| Release | `/release` | release-notes-and-handoff |
| GC | `/gc` | code-simplification + golden principles |

## Agent map

Start at repo root [AGENTS.md](../../AGENTS.md) for document map. **How we work:** [harness/knowledge/harness/README.md](../../harness/knowledge/harness/README.md).

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
- Checklists: `harness/references/`
- Command standards: `harness/scripts/agent/agent-skills-standards/`
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
| \`harness/scripts/agent/agent-skills-standards/\` | Related Coding Standards per command |
| \`harness/scripts/agent/local-skills/\` | ai-agent-template skills (restored after upstream sync) |
| \`harness/scripts/agent/local-commands/\` | Local slash commands (\`/spec\`, \`/gc\`, \`/release\`, \`/plan\`, \`/build\`) |
| \`harness/scripts/agent/sync-local-agent-skills.sh\` | Copy local-skills → \`.cursor/skills/\` |
| \`.cursor/commands/\` | Generated — upstream + standards + local |
| \`.cursor/rules/agent-skills.mdc\` | Orchestration (regenerated each sync) |

## Sync

\`\`\`bash
./harness/scripts/agent/sync-agent-skills.sh
\`\`\`
VENDOR

  cat >"$CURSOR/commands/README.md" <<'CMDREADME'
# Commands index (Cursor)

**Generated** by [`../../harness/scripts/agent/sync-agent-skills.sh`](../../harness/scripts/agent/sync-agent-skills.sh) — upstream English + [agent-skills-standards](../../harness/scripts/agent/agent-skills-standards/).

| Command | Standards |
|---------|-----------|
| `/spec` | [spec.md](../../harness/scripts/agent/agent-skills-standards/spec.md) |
| `/plan` | [plan.md](../../harness/scripts/agent/agent-skills-standards/plan.md) |
| `/build` | [build.md](../../harness/scripts/agent/agent-skills-standards/build.md) |
| `/code-build` | alias of `/build` |
| `/test` | [test.md](../../harness/scripts/agent/agent-skills-standards/test.md) |
| `/review` | [review.md](../../harness/scripts/agent/agent-skills-standards/review.md) |
| `/webperf` | [webperf.md](../../harness/scripts/agent/agent-skills-standards/webperf.md) |
| `/code-simplify` | [code-simplify.md](../../harness/scripts/agent/agent-skills-standards/code-simplify.md) |
| `/ship` | [ship.md](../../harness/scripts/agent/agent-skills-standards/ship.md) |
| `/release` | local — [release.md](../../harness/scripts/agent/local-commands/release.md) |
| `/gc` | local — [gc.md](../../harness/scripts/agent/local-commands/gc.md) |
| `/spec` | local — [spec.md](../../harness/scripts/agent/local-commands/spec.md) → `docs/specs/` |
| `/plan` | local — [plan.md](../../harness/scripts/agent/local-commands/plan.md) → `docs/exec-plans/active/` |
| `/build` | local — [build.md](../../harness/scripts/agent/local-commands/build.md) |
CMDREADME

  cat >"$CURSOR/README.md" <<'README'
# Cursor configuration (agent-skills)

Generated by `./harness/scripts/agent/sync-agent-skills.sh` from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).

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
| Standards (edit) | `harness/scripts/agent/agent-skills-standards/` |
| Commands (generated) | `.cursor/commands/` |
| Skills | `.cursor/skills/` |
| Agents | `.cursor/agents/` |
| References | `harness/references/` |

## Sync

```bash
./harness/scripts/agent/sync-agent-skills.sh
```

## SDLC

`/spec` → `/plan` → `/build` → `/test` → `/review` → `/code-simplify` → `/ship` → `/release`
USAGE

  echo "Bootstrapped .cursor/rules, VENDOR.md, README"
}

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
sync_local_commands
patch_cursor_commands
sync_local_agent_skills
patch_cursor_skills

SHA="$(git -C "$UPSTREAM" rev-parse HEAD 2>/dev/null || echo unknown)"
bootstrap_cursor_meta "$SHA"

echo ""
echo "Done. Upstream commit: $SHA"
echo "Edit standards only: harness/scripts/agent/agent-skills-standards/<command>.md"
