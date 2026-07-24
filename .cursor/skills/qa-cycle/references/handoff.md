# Handoff — `/qa` ↔ other skills

| Situation | Hop to |
|-----------|--------|
| As-built contracts wrong/incomplete vs **code** (schema stub, missing UI matrix, known-gaps overclaim, DESIGN↔code after user picks A\|B) | `/reverse-contracts` (`reverse-engineer-contracts`) — then re-run `/qa` `docs-review` |
| Product Expected incomplete / wrong FR / missing Testable AC | `/spec` (or repo product-spec workflow) |
| Scenario catalogue / rows missing | `/qa author` → `testcase-authoring` |
| Need Result write-back only | `/qa run` → `testcase-execution` |
| Runtime ≠ product Expected | Repo build workflow (`/build` + TDD) — **not** rewrite Expected in `/qa` |
| Missing automated tests claimed by catalogue | Test-writing skill (often `/test`) |
| QA Gate **READY** | `/ship` for GO/NO-GO (do not issue GO here) |

## With `reverse-engineer-contracts`

- **`/qa` / `qa-contracts-auditor` produce** `review-*.md` and name the next command.  
- **`/reverse-contracts` produces** as-built fixes from code (QA follow-up mode).  
- Do **not** reverse-engineer or patch contracts inside a `/qa` docs-review session — write the review, stop, hop.

## Loop (docs Conditional Pass)

1. `/qa` `docs-review` → Conditional Pass + open as-built DoD  
2. `/reverse-contracts` (QA follow-up)  
3. `/qa` `docs-review` again  
4. Continue `full-cycle` / `pre-ship` when docs are clear enough
