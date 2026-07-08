---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

Invoke the planning-and-task-breakdown skill.

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
