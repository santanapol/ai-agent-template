# Oracle — Expected vs as-built

## Source of truth (discover paths — table is role map, not fixed folders)

| Role | Typical location (hint only) | Use |
|------|------------------------------|-----|
| **Expected (product)** | Product specs / FR / Testable AC (from discovery) | Pass/Fail for scenarios |
| **As-built (contracts)** | API/behavior contracts if the repo keeps them separate | Drift check |
| **UI chrome** | Design docs the product cites | Layout/microcopy when relevant |
| **Scenario Expected** | Rows under the discovered scenarios root | Immediate oracle for Result |

**Rule:** If code ≠ product Expected → **Fail** (or product change via the repo’s spec workflow — not by silently rewriting Expected in `/qa`).

Contracts / as-built docs are **not** the product oracle. Use them to detect drift and to confirm observed error codes / paths when writing evidence.

**As-built docs ≠ code** (wrong schema, stub, missing matrix, overclaim in known-gaps) → docs-review Open gap + Recommend **`/reverse-contracts`** — not a scenario `product` Fail unless a scenario row already failed against Expected. See [handoff.md](handoff.md).

## Completeness for docs review

1. If discovery found a **docs DoD / product-completeness guide** → use it.  
2. Else use the generic questions in [review-template.md](review-template.md).

Docs-only gaps belong in the **docs review** / QA Gate blockers — not as scenario Result tags unless a scenario row already failed.

## Fail tags (scenario Results)

**Must match** `testcase-execution` [result-rules](../../testcase-execution/references/result-rules.md):

| Tag | Meaning |
|-----|---------|
| `product` | Behavior ≠ Expected; implementation likely wrong vs SoT |
| `missing_automation` | Automated column claims coverage but no matching test |
| `env` | Could not validly observe (wrong Env, flake, infra) — prefer Skip when entirely blocked |

Do **not** invent alternate Result tags. Put spec/contract gaps in docs review Open gaps (P0/P1/P2).

## Automation gap

If a row claims `unit`/`integration`/`e2e` (or repo equivalent) but no matching test exists → Fail or Skip with `missing_automation` and recommend the repo’s **test-writing** command/skill (often `/test`). Do not implement tests inside `/qa`.
