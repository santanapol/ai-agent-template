# Execution plans

Durable **how to build** checklists for agent workflows. Written by `/plan`; executed by `/build`; closed by `/build`, `/release`, or `/gc`.

## Layout

| Path | Purpose |
|------|---------|
| [`active/`](active/) | In-progress plans (`/plan`, `/build`) |
| [`completed/`](completed/) | Archived plans after ship or `/gc` |
| `tech-debt-tracker.md` | Optional rolling debt log (create when needed) |

## Convention

| Status | Path |
|--------|------|
| Active | `docs/exec-plans/active/<slug>.md` |
| Completed | `docs/exec-plans/completed/<slug>.md` |
| Tech debt tracker (optional) | `docs/exec-plans/tech-debt-tracker.md` |

Each active plan is **one file** with YAML front matter (`status`, `created`, `updated`, `services`) and sections: Objective, Progress log, Decision log, Tasks (`- [ ]`), Risks, Checkpoints.

## Not allowed

- `tasks/plan.md`, `tasks/todo.md` (gitignored — not source of truth)
- Plans at repo root

Product requirements live in [`../specs/`](../specs/README.md).
