---
name: plan
description: Break work into small verifiable tasks — durable output in docs/exec-plans/active/
disable-model-invocation: true
---

Read **harness-planning-conventions** (`.cursor/skills/harness-planning-conventions/SKILL.md`) first — it overrides upstream output paths for this repo.

Read `harness.config.yaml` for code zone paths.

Then read and follow **planning-and-task-breakdown** (`.cursor/skills/planning-and-task-breakdown/SKILL.md`) for the planning process (dependency graph, vertical slices, acceptance criteria, checkpoints).

Read the existing spec from `docs/specs/…` or `<code.backend|frontend>/**/docs/spec.md` (never repo root) and relevant codebase sections. Then:

1. **Check `docs/exec-plans/active/`** for overlapping work — extend an existing plan or create a new slug.
2. Enter plan mode — read only, no code changes.
3. Identify the dependency graph between components.
4. Slice work vertically (one complete path per task, not horizontal layers).
5. Write tasks with acceptance criteria and verification steps.
6. Add checkpoints between phases.
7. Present the plan for human review.

## Output (ai-agent-template — do not use `tasks/`)

Save **one durable file**:

`docs/exec-plans/active/<slug>.md`

- **Slug:** kebab-case from the feature or change (e.g. `deposit-matrix-tabs`, `auth-branch-pagination`). Add `-YYYY-MM` only if needed to avoid collision with an existing file in `active/` or `completed/`.
- **YAML front matter** (required):

```yaml
---
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
services: [staff]   # [] for repo-wide / harness work
---
```

- **Body sections** per [docs/exec-plans/README.md](../../../../docs/exec-plans/README.md): Objective, Progress log, Decision log, Tasks (`- [ ]` with acceptance + verify steps), Risks, Checkpoints.
- **Do not** create `tasks/plan.md`, `tasks/todo.md`, or any file under `tasks/` — that directory is gitignored and not the source of truth.

After human approval, `/build` reads the active exec plan from `docs/exec-plans/active/`.

## Related Coding Standards

`coding-standard/` is empty in this template — vendor your org standards after fork, then follow `coding-standard/<domain>/...` for the services in scope.
