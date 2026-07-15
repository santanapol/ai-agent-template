# Execution plans

First-class artifacts for multi-step work. Agents should check `active/` before starting overlapping work.

## Layout

| Path | Purpose |
|------|---------|
| `active/` | In-progress plans |
| `completed/` | Finished plans (archive) |
| `tech-debt-tracker.md` | Known debt with priority and owner |

Service-scoped feature plans also live here (not in a per-service `plans/` folder) — use the `services: [...]` front-matter field to scope a plan to one or more services. Each service `WORKFLOW.md` links back here.

## Plan file format

Every plan in `active/` or `completed/` must include YAML front matter:

```yaml
---
status: active | completed | cancelled
created: YYYY-MM-DD
updated: YYYY-MM-DD
services: [auth, gateway, staff]
---
```

## Body sections

```markdown
# Plan: <title>

## Objective
<one paragraph>

## Progress log
- YYYY-MM-DD: <what happened>

## Decision log
- YYYY-MM-DD: <decision> — <rationale>

## Tasks
- [ ] ...

## Risks
- ...
```

## Lifecycle

1. Create plan in `active/` when work spans more than one PR or service.
2. Update `updated` and progress log on each meaningful step.
3. Move to `completed/` when done; link merged PRs in the final progress entry.
4. Record unresolved items in `tech-debt-tracker.md`.

## Harness `/plan` and `/build`

Local slash commands (`scripts/agent/local-commands/plan.md`, `build.md`) override upstream agent-skills:

| Step | Path |
|------|------|
| `/plan` creates | `docs/exec-plans/active/<slug>.md` (YAML front matter + Tasks in one file) |
| `/build` reads | same active exec plan |
| On completion | move to `docs/exec-plans/completed/` |

Read **harness-planning-conventions** skill before planning. Do **not** use `tasks/plan.md` or `tasks/todo.md`.

See [docs/TEMPLATE.md](../TEMPLATE.md).
