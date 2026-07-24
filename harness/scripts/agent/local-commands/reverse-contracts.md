---
name: reverse-contracts
description: Reverse-engineer running code into as-built contracts (domain, API, UI, gaps)
disable-model-invocation: true
---

Read and follow **reverse-engineer-contracts** (`.cursor/skills/reverse-engineer-contracts/SKILL.md`) completely — including `references/` and `templates/`.

## Scope

- Bootstrap or refresh as-built contracts under the discovered contracts root (default `docs/specs/contracts/`)
- Modes: bootstrap · audit/refresh · QA follow-up (Conditional Pass DoD)
- Copy structure from skill `templates/`; fill from **code**

## With `/qa`

- `/qa` writes `review-*.md` and recommends this command when as-built ≠ code
- After QA follow-up fixes → suggest `/qa` `docs-review` for re-check (do not claim Pass yourself)
- Loop: `/qa` docs-review → Conditional Pass → `/reverse-contracts` → `/qa` docs-review

## Do not

- QA review Pass/Fail or QA Gate → `/qa`
- Scenario catalogue / Result runs → `/testcase-author` / `/testcase-run`
- Greenfield product “should be” → `/spec`
- Full-sync legacy OpenAPI over as-built without deprecate-as-SoT

SoT for this skill: `harness/scripts/agent/local-skills/reverse-engineer-contracts/` → sync with `./harness/scripts/agent/sync-local-agent-skills.sh`
