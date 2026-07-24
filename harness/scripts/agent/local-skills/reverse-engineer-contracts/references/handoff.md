# Handoff

| Situation | Hop to |
|-----------|--------|
| Need product “should be” before code exists | `/spec` (`spec-driven-development`) |
| Need to implement or fix runtime (path B) | `/build` (+ TDD) |
| Need scenario testcase docs | `/testcase-author` |
| Need to run scenarios / Result | `/testcase-run` |
| Need docs Pass/Fail review or QA Gate | `/qa` (`qa-cycle`) — after a large audit, prefer `docs-review` |
| QA docs-review found as-built gaps / Conditional Pass DoD | **This skill** (`/reverse-contracts`) |

## With `qa-cycle`

- **This skill produces** as-built contracts from code.  
- **`qa-cycle` / `qa-contracts-auditor` consume** product + contracts and write `review-*.md` (Recommend → this skill when as-built gaps).  
- Do not duplicate docs-review inside this skill.  
- After QA follow-up, always suggest `/qa` `docs-review` for re-check (see [qa-follow-up.md](qa-follow-up.md)).
