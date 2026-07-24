# Docs review template (`docs-review`)

Write under the **discovered** docs-review root as `review-YYYY-MM-DD-<slug>.md`.

Use the discovered docs DoD / product-completeness guide when present; otherwise the generic questions below.

```markdown
# Review — Product / contracts docs

**Date:** YYYY-MM-DD  
**Timezone:** <from discovery>  
**Reviewer:** qa-contracts-auditor (or /qa main)  
**Scope:** …  
**Verdict:** Pass | Conditional Pass | Fail

## Summary

| Question | Answer |
|----------|--------|
| Enough for QA Expected from product (+ contracts if any)? | Yes / No |
| Product-complete per DoD guide (or generic bar)? | Yes / Partial / No |
| Block ship on docs alone? | Yes / No |

## What passed (with evidence)

| Item | Evidence |
|------|----------|
| | |

## Open gaps

| ID | Severity | Where | Why it blocks / doesn't |
|----|----------|-------|-------------------------|
| | P0 / P1 / P2 | | |

## Recommend

Classify open gaps and name **one** next command each (see [handoff.md](handoff.md)):

| Gap kind | Next command |
|----------|--------------|
| As-built wrong/incomplete vs **code** (schema stub, UI matrix, known-gaps overclaim, DESIGN↔code after A\|B) | `/reverse-contracts` (QA follow-up) |
| Product Expected incomplete / wrong FR / missing Testable AC | `/spec` (product workflow) |
| Scenario coverage gaps | `/qa author` / `testcase-authoring` |
| Runtime ≠ Expected (implementation bug) | `/build` (+ TDD) — **not** this review |

- After `/reverse-contracts`, re-run `/qa` `docs-review`  
- Do **not** fix product code or reverse-engineer contracts inside this review session
```

## Verdict guidance

| Verdict | When |
|---------|------|
| **Pass** | DoD (or generic bar) met; no P0 gaps |
| **Conditional Pass** | Usable for QA; residual non-P0 gaps listed — if residual is as-built vs code, Recommend must include `/reverse-contracts` |
| **Fail** | Missing Testable AC / error oracle / SoT conflict that blocks Expected |

## Generic bar (when no DoD guide)

Enough when: actors/goals clear, happy path + main errors testable, invariants stated, and Expected can be written without reading implementation as oracle.
