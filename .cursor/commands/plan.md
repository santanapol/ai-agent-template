---
name: plan
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
disable-model-invocation: true
---


Read and follow **planning-and-task-breakdown** (`.cursor/skills/planning-and-task-breakdown/SKILL.md`) completely.

Read the existing spec (SPEC.md or equivalent) and the relevant codebase sections. Then:

1. Enter plan mode — read only, no code changes
2. Identify the dependency graph between components
3. Slice work vertically (one complete path per task, not horizontal layers)
4. Write tasks with acceptance criteria and verification steps
5. Add checkpoints between phases
6. Present the plan for human review

Save the plan to tasks/plan.md and task list to tasks/todo.md.

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/1-tech-stack.md`
- `coding-standard/backend/2-folder-structure.md`
- `coding-standard/backend/3-api-routing.md`
- `coding-standard/backend/6-api-response-codes.md`
- `coding-standard/backend/12-data-management.md`

**Auth:**
- `coding-standard/auth/1-tech-stack.md`
- `coding-standard/auth/2-folder-structure.md`
- `coding-standard/auth/3-api-routing.md`
- `coding-standard/auth/6-api-response-codes.md`
- `coding-standard/auth/12-data-management.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/1-tech-stack.md`
- `coding-standard/frontend/backoffice/2-folder-structure.md`
- `coding-standard/frontend/backoffice/3-routing-and-pages.md`
- `coding-standard/frontend/backoffice/4-state-management.md`
- `coding-standard/frontend/backoffice/5-api-integration.md`

**Gateway:**
- `coding-standard/gateway/1-tech-stack.md`
- `coding-standard/gateway/2-folder-structure.md`
- `coding-standard/gateway/3-api-routing.md`
- `coding-standard/gateway/6-api-response-codes.md`
