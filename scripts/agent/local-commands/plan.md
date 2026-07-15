---
name: plan
description: Break work into small verifiable tasks — durable output in docs/exec-plans/active/
disable-model-invocation: true
---

Read **harness-planning-conventions** (`.cursor/skills/harness-planning-conventions/SKILL.md`) first — it overrides upstream output paths for this repo.

Then read and follow **planning-and-task-breakdown** (`.cursor/skills/planning-and-task-breakdown/SKILL.md`) for the planning process (dependency graph, vertical slices, acceptance criteria, checkpoints).

Read the existing spec (`docs/specs/…`, service `SPEC.md`, or equivalent) and relevant codebase sections. Then:

1. **Check `docs/exec-plans/active/`** for overlapping work — extend an existing plan or create a new slug.
2. Enter plan mode — read only, no code changes.
3. Identify the dependency graph between components.
4. Slice work vertically (one complete path per task, not horizontal layers).
5. Write tasks with acceptance criteria and verification steps.
6. Add checkpoints between phases.
7. Present the plan for human review.

## Output (zero-platform — do not use `tasks/`)

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

- **Body sections** per [docs/exec-plans/README.md](../../docs/exec-plans/README.md): Objective, Progress log, Decision log, Tasks (`- [ ]` with acceptance + verify steps), Risks, Checkpoints.
- **Do not** create `tasks/plan.md`, `tasks/todo.md`, or any file under `tasks/` — that directory is gitignored and not the source of truth.

After human approval, `/build` reads the active exec plan from `docs/exec-plans/active/`.

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/01-tech-stack.md`
- `coding-standard/backend/02-folder-structure.md`
- `coding-standard/backend/03-api-routing.md`
- `coding-standard/backend/06-api-response-codes.md`
- `coding-standard/backend/12-data-management.md`

**Auth:**
- `coding-standard/auth/01-tech-stack.md`
- `coding-standard/auth/02-folder-structure.md`
- `coding-standard/auth/03-api-routing.md`
- `coding-standard/auth/06-api-response-codes.md`
- `coding-standard/auth/12-data-management.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/01-tech-stack.md`
- `coding-standard/frontend/backoffice/02-folder-structure.md`
- `coding-standard/frontend/backoffice/03-routing-and-pages.md`
- `coding-standard/frontend/backoffice/04-state-management.md`
- `coding-standard/frontend/backoffice/05-api-integration.md`

**Gateway:**
- `coding-standard/gateway/01-tech-stack.md`
- `coding-standard/gateway/02-folder-structure.md`
- `coding-standard/gateway/03-api-routing.md`
- `coding-standard/gateway/06-api-response-codes.md`
