---
name: spec
description: Write a structured specification — durable output in docs/specs/<slug>.md (never repo root)
disable-model-invocation: true
---

Read **harness-planning-conventions** (`.cursor/skills/harness-planning-conventions/SKILL.md`) first — it overrides upstream output paths for this repo.

Then read and follow **spec-driven-development** (`.cursor/skills/spec-driven-development/SKILL.md`) for the six core areas, clarifying questions, and human review gates.

Begin by understanding what the user wants to build. Ask clarifying questions about:

1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)

## Output (ai-agent-template — not repo root)

Save **one durable file**:

`docs/specs/<slug>.md`

- **Slug:** kebab-case from the feature or project (e.g. `deposit-matrix`, `backoffice-auth`). Add `-YYYY-MM` only if needed to avoid collision with an existing file.
- Create `docs/specs/` on first spec — `docs/` is empty in the template skeleton.
- Use the spec template from **spec-driven-development** (Objective, Tech Stack, Commands, Project Structure, Code Style, Testing Strategy, Boundaries, Success Criteria, Open Questions).
- Confirm with the user before `/plan` or `/build`.

### Service-scoped specs (optional)

Read `harness.config.yaml` for `code.backend` and `code.frontend`. When the change is limited to one service, you may instead (or additionally) write:

`<code.backend>/<service>/docs/spec.md` or `<code.frontend>/<app>/docs/spec.md`

Never at repo root: `SPEC.md`, `docs/SPEC.md`, `spec/`, `tasks/`, `_mission-control/`.

## Related Coding Standards

`coding-standard/` is empty in this template — vendor your org standards after fork, then follow `coding-standard/<domain>/...` for the services in scope.
