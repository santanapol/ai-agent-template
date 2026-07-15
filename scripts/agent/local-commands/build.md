---
name: build
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
disable-model-invocation: true
---

Read **harness-planning-conventions** (`.cursor/skills/harness-planning-conventions/SKILL.md`) for where plans live in this repo.

Read and follow **incremental-implementation** (`.cursor/skills/incremental-implementation/SKILL.md`) completely, alongside **test-driven-development** (`.cursor/skills/test-driven-development/SKILL.md`).

## Plan source (zero-platform)

Durable plans live in **`docs/exec-plans/active/<slug>.md`** — not `tasks/plan.md`.

- If the user names a plan file, use that path under `docs/exec-plans/active/`.
- If only one file exists in `docs/exec-plans/active/`, use it.
- If multiple active plans exist, ask which file to execute.
- If none exists, run `/plan` (or **planning-and-task-breakdown** with **harness-planning-conventions**) to create one in `docs/exec-plans/active/` before implementing.

## Modes

- **`/build`** — implement the *next* pending task, then stop (careful, one slice at a time).
- **`/build auto`** — generate the plan if needed, get a single approval, then implement *every* task without stopping between them.

`$ARGUMENTS` selects the mode. Treat `auto` (canonical) or `all` as autonomous mode; anything else (or empty) is the default single-task mode.

## Default: one task

Pick the next pending task from the active exec plan. Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. Write a failing test for the expected behavior (RED)
4. Implement the minimum code to pass the test (GREEN)
5. Run the full test suite to check for regressions
6. Run the build to verify compilation
7. Commit with a descriptive message
8. Mark the task complete in the exec plan (`updated` date + progress log) and stop

## Autonomous: the whole plan (`/build auto`)

1. **Require a spec.** Look for a spec at `docs/specs/`, service `*-spec.md`, `SPEC.md` at repo root, `docs/SPEC.md`, or under `spec/`. If none exists, stop and tell the user to run `/spec` first.
2. **Establish a clean baseline.** Run `git status --porcelain`. If there are uncommitted changes outside expected planning artifacts (`docs/exec-plans/active/*.md`, `docs/specs/**`, `SPEC.md`, `spec/*`), stop and ask the user to commit, stash, or confirm.
3. **Plan if needed.** If there is no suitable file in `docs/exec-plans/active/`, follow **planning-and-task-breakdown** + **harness-planning-conventions** to create one.
4. **Single checkpoint.** Present the full plan and wait for unambiguous approval. If you created a new exec plan, commit it as a single preparatory commit before the first implementation commit.
5. **Execute every task in dependency order** — RED → GREEN → regression → build → commit → mark complete in the exec plan. One commit per task; stage only files that task touched.
6. **Stop and ask** on test/build failure, spec ambiguity, or high-risk/irreversible changes.
7. **Summarize** tasks completed, tests added, commits made, and anything deferred.

If any step fails, follow **debugging-and-error-recovery** (`.cursor/skills/debugging-and-error-recovery/SKILL.md`).

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/01-tech-stack.md`
- `coding-standard/backend/02-folder-structure.md`
- `coding-standard/backend/03-api-routing.md`
- `coding-standard/backend/04-request-headers.md`
- `coding-standard/backend/05-security-and-validation.md`
- `coding-standard/backend/06-api-response-codes.md`
- `coding-standard/backend/07-openapi-contract.md`
- `coding-standard/backend/08-openapi-validation.md`
- `coding-standard/backend/11-database-connection.md`
- `coding-standard/backend/12-data-management.md`
- `coding-standard/backend/13-code-quality.md`

**Auth:**
- `coding-standard/auth/01-tech-stack.md`
- `coding-standard/auth/02-folder-structure.md`
- `coding-standard/auth/03-api-routing.md`
- `coding-standard/auth/04-request-headers.md`
- `coding-standard/auth/05-security-and-validation.md`
- `coding-standard/auth/06-api-response-codes.md`
- `coding-standard/auth/07-openapi-contract.md`
- `coding-standard/auth/08-openapi-validation.md`
- `coding-standard/auth/11-database-connection.md`
- `coding-standard/auth/12-data-management.md`
- `coding-standard/auth/13-code-quality.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/01-tech-stack.md`
- `coding-standard/frontend/backoffice/02-folder-structure.md`
- `coding-standard/frontend/backoffice/03-routing-and-pages.md`
- `coding-standard/frontend/backoffice/04-state-management.md`
- `coding-standard/frontend/backoffice/05-api-integration.md`
- `coding-standard/frontend/backoffice/06-ui-and-styling.md`
- `coding-standard/frontend/backoffice/07-authentication.md`
- `coding-standard/frontend/backoffice/08-error-handling.md`
- `coding-standard/frontend/backoffice/10-code-quality.md`

**Gateway:**
- `coding-standard/gateway/01-tech-stack.md`
- `coding-standard/gateway/02-folder-structure.md`
- `coding-standard/gateway/03-api-routing.md`
- `coding-standard/gateway/04-request-headers.md`
- `coding-standard/gateway/05-security-and-validation.md`
- `coding-standard/gateway/06-api-response-codes.md`
- `coding-standard/gateway/07-openapi-contract.md`
- `coding-standard/gateway/08-openapi-validation.md`
- `coding-standard/gateway/11-code-quality.md`
