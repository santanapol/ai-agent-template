---
name: build
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
disable-model-invocation: true
---


Read and follow **incremental-implementation** (`.cursor/skills/incremental-implementation/SKILL.md`) completely. alongside agent-skills:test-driven-development.

## Modes

- **`/build`** — implement the *next* pending task, then stop (careful, one slice at a time).
- **`/build auto`** — generate the plan if needed, get a single approval, then implement *every* task without stopping between them.

`$ARGUMENTS` selects the mode. Treat `auto` (canonical) or `all` as autonomous mode; anything else (or empty) is the default single-task mode. Note: autonomous mode is not faster *per task* — it runs the same test-driven loop — it only removes the human stepping *between* tasks.

## Default: one task

Pick the next pending task from the plan. Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Commit with a descriptive message
8. Mark the task complete and stop

## Autonomous: the whole plan (`/build auto`)

Use this once a spec exists and you want to collapse plan + build into one run. It removes the manual stepping between tasks — **not** the verification. Every task still earns a passing test and its own commit.

1. **Require a spec.** Look only for a spec at a known path: `SPEC.md` at the repo root, `docs/SPEC.md`, or a file under `spec/`. A README or arbitrary doc does **not** count. If none exists, stop and tell the user to run `/spec` first — do not invent requirements.
2. **Establish a clean baseline.** Run `git status --porcelain`. If there are uncommitted changes outside the expected planning artifacts (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tasks/plan.md`, `tasks/todo.md`), stop and ask the user to commit, stash, or confirm how to handle them. Autonomous per-task commits must not absorb unrelated local work, or the clean-rollback guarantee breaks.
3. **Plan if needed.** If there is no `tasks/plan.md`, follow **planning-and-task-breakdown** (`.cursor/skills/planning-and-task-breakdown/SKILL.md`) to generate one.
4. **Single checkpoint.** Present the full plan and wait for an unambiguous affirmative (e.g. "approve", "go", "yes"). Treat hedged responses ("looks reasonable", "I guess") as **not** approved. This is the only human gate — after approval, run autonomously. If you generated `tasks/plan.md`, commit it as a single preparatory commit now so it doesn't bleed into the first task's commit.
5. **Execute every task in dependency order.** Use each task's declared dependencies; if they aren't explicit, execute in the order the plan lists them. For each task, run the full default loop above (RED → GREEN → regression → build → commit → mark complete). Stage only the files that task touched plus its task-status update — never `git add -A` blindly — and make one commit per task so any point is a clean rollback.
6. **Stop and ask the user** (do not push through) when:
   - a test can't be made to pass or the build breaks without an obvious fix → follow **debugging-and-error-recovery** (`.cursor/skills/debugging-and-error-recovery/SKILL.md`)
   - the spec is ambiguous, or a task needs a decision the spec doesn't cover
   - a task is high-risk or irreversible — auth/permission changes, destructive data migrations, payments, deletions, deploys, anything touching secrets, **or anything you can't undo with `git revert`** → follow **doubt-driven-development** (`.cursor/skills/doubt-driven-development/SKILL.md`) and get explicit sign-off before continuing

   After the user resolves a blocker, they re-invoke `/build auto` — it resumes from the next pending task.
7. **Summarize at the end:** tasks completed, tests added, commits made, and anything skipped, flagged, or left for the user.

If any step fails, follow the agent-skills:debugging-and-error-recovery skill.

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/1-tech-stack.md`
- `coding-standard/backend/2-folder-structure.md`
- `coding-standard/backend/3-api-routing.md`
- `coding-standard/backend/4-request-headers.md`
- `coding-standard/backend/5-security-and-validation.md`
- `coding-standard/backend/6-api-response-codes.md`
- `coding-standard/backend/7-openapi-contract.md`
- `coding-standard/backend/8-openapi-validation.md`
- `coding-standard/backend/11-database-connection.md`
- `coding-standard/backend/12-data-management.md`
- `coding-standard/backend/13-code-quality.md`

**Auth:**
- `coding-standard/auth/1-tech-stack.md`
- `coding-standard/auth/2-folder-structure.md`
- `coding-standard/auth/3-api-routing.md`
- `coding-standard/auth/4-request-headers.md`
- `coding-standard/auth/5-security-and-validation.md`
- `coding-standard/auth/6-api-response-codes.md`
- `coding-standard/auth/7-openapi-contract.md`
- `coding-standard/auth/8-openapi-validation.md`
- `coding-standard/auth/11-database-connection.md`
- `coding-standard/auth/12-data-management.md`
- `coding-standard/auth/13-code-quality.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/1-tech-stack.md`
- `coding-standard/frontend/backoffice/2-folder-structure.md`
- `coding-standard/frontend/backoffice/3-routing-and-pages.md`
- `coding-standard/frontend/backoffice/4-state-management.md`
- `coding-standard/frontend/backoffice/5-api-integration.md`
- `coding-standard/frontend/backoffice/6-ui-and-styling.md`
- `coding-standard/frontend/backoffice/7-authentication.md`
- `coding-standard/frontend/backoffice/8-error-handling.md`
- `coding-standard/frontend/backoffice/10-code-quality.md`

**Gateway:**
- `coding-standard/gateway/1-tech-stack.md`
- `coding-standard/gateway/2-folder-structure.md`
- `coding-standard/gateway/3-api-routing.md`
- `coding-standard/gateway/4-request-headers.md`
- `coding-standard/gateway/5-security-and-validation.md`
- `coding-standard/gateway/6-api-response-codes.md`
- `coding-standard/gateway/7-openapi-contract.md`
- `coding-standard/gateway/8-openapi-validation.md`
- `coding-standard/gateway/11-code-quality.md`
