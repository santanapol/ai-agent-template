---
name: harness-planning-conventions
description: ai-agent-template override for planning output paths. Read before /plan, /build, planning-and-task-breakdown, or spec-driven-development when saving a plan — durable SoT is docs/exec-plans/active/, never tasks/.
---

# Harness planning conventions (ai-agent-template)

Overrides upstream agent-skills output paths for **this repository only**.

## Source of truth

| Purpose | Path | Commit? |
|---------|------|---------|
| Active durable plan | `docs/exec-plans/active/<slug>.md` | Yes |
| Completed plan | `docs/exec-plans/completed/<slug>.md` | Yes |
| Tech debt | `docs/exec-plans/tech-debt-tracker.md` | Yes |
| `tasks/plan.md`, `tasks/todo.md` | **Do not create** | N/A (gitignored safety net only) |

Create `docs/exec-plans/` structure when you start planning — `docs/` is empty in the template skeleton.

## When `/plan` or planning-and-task-breakdown runs

1. Check `docs/exec-plans/active/` for overlap.
2. Apply the planning process from **planning-and-task-breakdown** (dependency graph, vertical slices, acceptance criteria).
3. Write **one file** to `docs/exec-plans/active/<slug>.md` with required YAML front matter (`status`, `created`, `updated`, `services`).
4. Put checklist tasks in a `## Tasks` section in the same file — no separate `tasks/todo.md`.
5. Present for human review before `/build`.

## When `/build` runs

1. Read the active exec plan from `docs/exec-plans/active/` (resolve ambiguity if multiple).
2. Mark tasks complete in that file; update `updated` and `## Progress log`.
3. On completion, move the plan to `docs/exec-plans/completed/` and set `status: completed`.

## Forbidden

- Do not write or commit `tasks/plan.md` or `tasks/todo.md`.
- Do not create `_mission-control/` for specs — use `docs/specs/` or service docs under `code-base/`.

## References

- Local slash commands: `scripts/agent/local-commands/plan.md`, `build.md`
- Code zone: `code-base/backend/`, `code-base/frontend/`
