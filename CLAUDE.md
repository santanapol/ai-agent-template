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
