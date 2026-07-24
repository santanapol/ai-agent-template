# Modes — `/qa` / `qa-cycle`

Report paths below are **default conventions**. Prefer paths from [repo-discovery.md](repo-discovery.md). If the repo documents different roots, use those.

| Mode | Covers | Report (default convention) | Fan-out `security-auditor` + `test-engineer` |
|------|--------|------------------------------|-----------------------------------------------|
| `docs-review` | Docs dimension only | `<contracts-or-docs-review-root>/review-YYYY-MM-DD-*.md` | No |
| `author` | Write/expand scenario cases | — | No |
| `run` | Execute + Result write-back | Scenario files | No |
| `full-cycle` | Docs + author (if needed) + run + Pass/Fail summary | `<testcase-reports-root>/qa-run-YYYY-MM-DD.md` | No |
| **`pre-ship`** | All dimensions through QA Gate | **`<testcase-reports-root>/qa-gate-YYYY-MM-DD.md`** | **Yes** (after functional Results) |

Common defaults when the repo is silent and the user confirms bootstrap-style layout: contracts reviews under a contracts folder; QA reports under the test-cases `reports/` folder.

## Default selection

1. User named a mode → use it.  
2. User intent = ship readiness (“ready for ship”, “pre-ship”, “จน ship / พร้อมปล่อย”, …) → **`pre-ship`**.  
3. Otherwise ask once: `docs-review | author | run | full-cycle | pre-ship`.

## `full-cycle` vs `pre-ship`

- **`full-cycle`:** functional evidence + docs; summary via [qa-run-template.md](qa-run-template.md). No security/test fan-out. No READY/NOT READY gate.  
- **`pre-ship`:** discovered CI + smoke + persona fan-out + perf/a11y/ops, then **QA Gate** ([qa-gate-template.md](qa-gate-template.md)).

## Author hop (shared)

See SKILL **When to hop authoring**.

## Reverse-contracts hop (shared)

See SKILL **When to hop reverse-engineer-contracts** and [handoff.md](handoff.md).  
`docs-review` / Conditional Pass with as-built gaps → write review → hop `/reverse-contracts` → re-`docs-review`. Do not patch contracts inside `/qa`.

## Report naming

Use the **discovered session timezone** calendar date (`YYYY-MM-DD`). Docs-review suffix may be a short slug (e.g. `pass`, `conditional-pass`, `fail`).
