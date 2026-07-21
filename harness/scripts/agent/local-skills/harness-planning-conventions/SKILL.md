---
name: harness-planning-conventions
description: ai-agent-template override for spec, plan, and code paths. Read before /spec, /plan, /build — read harness.config.yaml for code zones; docs workflow is always under docs/, never repo root or tasks/.
---

# Harness output conventions (ai-agent-template)

Overrides upstream agent-skills output paths for **this repository only**.

## Code layout (`harness.config.yaml`)

Read **`harness.config.yaml`** at repo root before `/build` or when referencing application code.

| `layout` | Meaning | Typical paths |
|----------|---------|---------------|
| `code-base` | Greenfield — code under `code-base/` | `code-base/backend`, `code-base/frontend` |
| `root` | Brownfield — existing code at repo root | `backend`, `frontend` (or custom — see config) |

Switch profiles: `./harness/scripts/agent/set-code-layout.sh code-base|root` — guide: `harness/knowledge/harness/adopt.md`.

Use `code.backend` and `code.frontend` from the config as the **code zones** below (not hardcoded `code-base/`).

## Source of truth (docs — always the same)

| Purpose | Path | Commit? |
|---------|------|---------|
| Product / feature spec | `docs/specs/<slug>.md` | Yes |
| Service-scoped spec (optional) | `<code.backend>/<service>/docs/spec.md` or `<code.frontend>/<app>/docs/spec.md` | Yes |
| Active durable plan | `docs/exec-plans/active/<slug>.md` | Yes |
| Completed plan | `docs/exec-plans/completed/<slug>.md` | Yes |
| Tech debt | `docs/exec-plans/tech-debt-tracker.md` | Yes |
| `tasks/plan.md`, `tasks/todo.md` | **Do not create** | N/A (gitignored safety net only) |

Create `docs/specs/` and `docs/exec-plans/` when you start.

## When `/spec` or spec-driven-development runs

1. Read existing specs under `docs/specs/` for overlap.
2. Write **one file** to `docs/specs/<slug>.md` using the six core areas from **spec-driven-development**.
3. Present for human review before `/plan` or `/build`.

## When `/plan` or planning-and-task-breakdown runs

1. Read spec from `docs/specs/…` or `<code.backend|frontend>/**/docs/spec.md` — never repo root.
2. Check `docs/exec-plans/active/` for overlap.
3. Apply **planning-and-task-breakdown** (dependency graph, vertical slices, acceptance criteria).
4. Write **one file** to `docs/exec-plans/active/<slug>.md` with YAML front matter (`status`, `created`, `updated`, `services`).
5. Put checklist tasks in `## Tasks` — no separate `tasks/todo.md`.
6. Present for human review before `/build`.

## When `/build` runs

1. Read `harness.config.yaml` for `code.backend` and `code.frontend`.
2. Require a spec under `docs/specs/` or `<code zone>/**/docs/spec.md`.
3. Read the active exec plan from `docs/exec-plans/active/` (resolve ambiguity if multiple).
4. Implement under the configured code zones; mark tasks complete; update `updated` and `## Progress log`.
5. On completion, move the plan to `docs/exec-plans/completed/` and set `status: completed`.

## Forbidden (repo root and ephemeral)

| Path | Why |
|------|-----|
| `SPEC.md` (root) | Use `docs/specs/<slug>.md` |
| `docs/SPEC.md` | Use `docs/specs/<slug>.md` |
| `spec/` (root) | Use `docs/specs/` |
| `tasks/plan.md`, `tasks/todo.md` | Use `docs/exec-plans/active/<slug>.md` |
| `_mission-control/` | Use `docs/specs/` and `docs/exec-plans/` |

Release notes belong in `docs/releases/` (optional root `CHANGELOG.md` only if the project explicitly tracks semver there).

## References

- Layout guide: `harness/knowledge/harness/adopt.md`
- Conventions: `docs/specs/README.md`, `docs/exec-plans/README.md`
- Local slash commands: `harness/scripts/agent/local-commands/spec.md`, `plan.md`, `build.md`
