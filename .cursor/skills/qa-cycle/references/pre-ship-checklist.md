# Pre-ship checklist

Use for mode **`pre-ship`** only. Complete steps in order; fan-out security/test **after** functional Results. All concrete commands and journeys come from [repo-discovery.md](repo-discovery.md).

## Entry criteria

- [ ] Mode confirmed as `pre-ship` (or user intent = ship readiness)
- [ ] Discovery table filled
- [ ] Product oracle (+ contracts if the repo has them) readable
- [ ] Testcase tree exists **or** author hop will create it — see SKILL “When to hop authoring”
- [ ] Prep / RUNBOOK known when scenarios need Env services

## Exit criteria → QA Gate

- [ ] Docs verdict recorded (Pass / Conditional Pass / Fail)
- [ ] In-scope scenario Results written (or Skip + reason)
- [ ] Discovered **app CI** command(s) recorded (Pass/Fail) — or Skip + reason if repo has no CI script
- [ ] Regression smoke recorded (Pass/Fail/Skip) using **discovered** smoke list
- [ ] `security-auditor` + `test-engineer` summaries attached (or Skip + reason if blocked)
- [ ] Perf / A11y / Ops rows: Pass or Skip + reason (never silent Pass)
- [ ] QA Gate file written under discovered reports root
- [ ] Verdict **READY** or **NOT READY** with blockers listed

## Dimensions

| Dimension | How |
|-----------|-----|
| Docs | `qa-contracts-auditor` + discovered DoD (or review-template generics) |
| Functional | `testcase-authoring` → `testcase-execution` |
| Automation CI | Discovered CI command(s) in discovered code zone(s) |
| Regression | Discovered smoke journeys (RUNBOOK / testing guide / catalogue) |
| Security | Fan-out `security-auditor` after Results |
| Test quality | Fan-out `test-engineer` after Results |
| Perf / A11y / Ops | Repo criteria if documented; else portable defaults below |

## Perf (Pass or Skip + reason)

Portable defaults — replace/augment with repo-documented gates when found:

- Critical write/mutation paths honor any **runtime constraint** the repo documents (example pattern: “not Edge” / region / timeout) — run the repo’s check script if one exists  
- Primary documented entry journeys: no **obvious** request waterfall visible from a short code or network look  
- If no criteria and no evidence → **Skip** + reason (do not Pass)

## A11y — portable bar (Pass or Skip + reason)

- Primary dialogs/sheets/modals in scope have an accessible name/title  
- Critical forms in the smoke list are usable with basic keyboard  
- Important errors are not color-only (include text)  
- If UI not in scope this run → **Skip** + reason

## Ops (Pass or Skip + reason)

- Follow discovered ops/RUNBOOK for local migrate/seed/bootstrap when the run needs them  
- For in-scope integrations (payments, email, object storage, cron, …): required env/secrets are **documented** when the feature is ON — do not require live third-party calls if the repo marks them deferred  
- If no ops docs and nothing to verify → **Skip** + reason

## Phase J

On any open Fail/blocker: list ID + evidence + recommend the repo’s fix/test/author commands (often `/build`, `/test`, `/testcase-author`). **Do not** fix product code in this `/qa` session.
