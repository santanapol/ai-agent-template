---
name: build
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
disable-model-invocation: true
---

Read **harness-planning-conventions** (`.cursor/skills/harness-planning-conventions/SKILL.md`) for where plans and code zones live in this repo.

Read `harness.config.yaml` at repo root before implementing — use `code.backend` and `code.frontend` as the application code zones.

Read and follow **incremental-implementation** (`.cursor/skills/incremental-implementation/SKILL.md`) completely, alongside **test-driven-development** (`.cursor/skills/test-driven-development/SKILL.md`).

## Plan source (ai-agent-template)

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

1. **Require a spec.** Look under `docs/specs/` or `<code.backend|frontend>/**/docs/spec.md` (from `harness.config.yaml`). If none exists, stop and tell the user to run `/spec` first.
2. **Establish a clean baseline.** Run `git status --porcelain`. If there are uncommitted changes outside expected planning artifacts (`docs/exec-plans/active/*.md`, `docs/specs/**`, and service specs under configured code zones), stop and ask the user to commit, stash, or confirm.
3. **Plan if needed.** If there is no suitable file in `docs/exec-plans/active/`, follow **planning-and-task-breakdown** + **harness-planning-conventions** to create one.
4. **Single checkpoint.** Present the full plan and wait for unambiguous approval. If you created a new exec plan, commit it as a single preparatory commit before the first implementation commit.
5. **Execute every task in dependency order** — RED → GREEN → regression → build → commit → mark complete in the exec plan. One commit per task; stage only files that task touched.
6. **Stop and ask** on test/build failure, spec ambiguity, or high-risk/irreversible changes.
7. **Summarize** tasks completed, tests added, commits made, and anything deferred.

If any step fails, follow **debugging-and-error-recovery** (`.cursor/skills/debugging-and-error-recovery/SKILL.md`).

## Related Coding Standards

`coding-standard/` is empty in this template — vendor org standards after fork, then read applicable paths under `coding-standard/<domain>/` before implementing.

## Related Coding Standards

`coding-standard/` is empty in this template — vendor org standards after fork, then read applicable paths under `coding-standard/<domain>/` before implementing.
