---
name: qa
description: Portable QA cycle — docs, scenarios, discovered CI/smoke, (pre-ship) security/test fan-out — QA Gate READY|NOT READY before /ship
disable-model-invocation: true
---

Read and follow **qa-cycle** (`.cursor/skills/qa-cycle/SKILL.md`) completely — including `.cursor/skills/qa-cycle/references/` (repo discovery first).

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
- Hop `reverse-engineer-contracts` (`/reverse-contracts`) when docs-review needs **as-built fixes from code** — after writing the review, not inside it (see `.cursor/skills/qa-cycle/references/handoff.md`)
- Spawn `qa-contracts-auditor` for docs; in `pre-ship` fan-out `security-auditor` + `test-engineer` **after** Results

## Do not

- Fix product bugs in the same session → record Fail + recommend build workflow
- Reverse-engineer / patch as-built contracts in the same session → recommend `/reverse-contracts`, then re-`docs-review`
- Write automated tests → test-writing skill (often `/test`)
- Issue Ship GO/NO-GO → `/ship` (reuse latest QA Gate when fresh per skill)
- Fan-out security/test in `full-cycle` or lighter modes
- Hardcode domain journeys or package managers

Skill refs: `.cursor/skills/qa-cycle/references/`

## Harness verification (portable)

Before **QA Gate READY** (`pre-ship`):

1. Run any **discovered** docs-lint / harness docs gate (if the repo defines one)
2. Run **discovered** app CI command(s) in discovered code zone(s)
3. Scenario Results recorded for in-scope rows (or Skip + reason)
4. Attach `security-auditor` + `test-engineer` summaries (after functional) — `/ship` may reuse if **fresh** (see below)

Lighter modes do not require the full gate; still run discovered docs-lint when writing review/report files under docs.

See [AGENTS.md](../../AGENTS.md) for this repo’s map (discovery still required).

## Related Coding Standards

`coding-standard/` may be empty — vendor org QA standards after fork when needed.

## Overlap with `/ship`

`/qa` issues **READY|NOT READY** only. Ship GO/NO-GO stays with `/ship`.

**Fresh** (reuse persona fan-out without re-run): latest `qa-gate-*.md` is from today (**session timezone from discovery**) or age ≤ 24h, **and** no material diff after the gate under **discovered** material paths (code zones + product oracle + in-scope scenarios).

## Overlap with `/reverse-contracts`

`/qa` reviews product + contracts and writes `review-*.md`. `/reverse-contracts` refreshes as-built from code. Loop: docs-review → Conditional Pass (as-built) → `/reverse-contracts` → docs-review again.
