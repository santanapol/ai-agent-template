---
name: qa
description: Portable QA cycle — docs, scenarios, discovered CI/smoke, (pre-ship) security/test fan-out — QA Gate READY|NOT READY before /ship
disable-model-invocation: true
---

Read and follow **qa-cycle** (`.cursor/skills/qa-cycle/SKILL.md`) completely — including `references/` (repo discovery first).

## Modes

`docs-review` · `author` · `run` · `full-cycle` · **`pre-ship`**

If unspecified: ask once. Ship-readiness intent → **`pre-ship`**.

| Mode | Fan-out security/test | Report |
|------|----------------------|--------|
| `full-cycle` | No | discovered reports root → `qa-run-*.md` |
| `pre-ship` | Yes (after functional) | discovered reports root → `qa-gate-*.md` |

Discover first. Only `pre-ship` issues READY|NOT READY. Do not assume a product domain or fixed CI command.

## Scope

- Orchestrate QA evidence until QA Gate (pre-ship) or the lighter mode’s exit
- Hop `testcase-authoring` / `testcase-execution` as the skill directs
- Hop `reverse-engineer-contracts` (`/reverse-contracts`) when docs-review needs **as-built fixes from code** — after writing the review, not inside it (see `qa-cycle` `references/handoff.md`)
- Spawn `qa-contracts-auditor` for docs; in `pre-ship` fan-out `security-auditor` + `test-engineer` **after** Results

## Do not

- Fix product bugs in the same session → record Fail + recommend build workflow
- Reverse-engineer / patch as-built contracts in the same session → recommend `/reverse-contracts`, then re-`docs-review`
- Write automated tests → test-writing skill (often `/test`)
- Issue Ship GO/NO-GO → `/ship` (reuse latest QA Gate when fresh per skill)
- Fan-out security/test in `full-cycle` or lighter modes
- Hardcode domain journeys or package managers

Skill refs: `.cursor/skills/qa-cycle/references/`
