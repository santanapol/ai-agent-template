# Report template (portable)

Write **only when the user asks**. Path: prefer `docs/test-cases/reports/` (or discovery).  
Filename: `YYYY-MM-DD-<slice-or-zone>.md`.

Filled example: [examples-run.md](examples-run.md) § Sample report.

```markdown
# Test run report: <Slice or zone>

**Date:** YYYY-MM-DD
**Env:** <from discovery / scenario>
**Scope:** <files or IDs>
**Executor:** agent | human
**Discovery:** runner / prep sources (paths only)
**Stop policy:** continue-on-fail | stop-on-first-fail (as applied)

## Summary

| Result | Count |
|--------|------:|
| Pass | |
| Fail | |
| Skip | |
| **Total** | |

### Fail breakdown

| Tag | Count |
|-----|------:|
| product | |
| missing_automation | |
| env | |

## Failures

| ID | Tag | Expected | Observed | Evidence |
|----|-----|----------|----------|----------|
| | product \| missing_automation \| env | | | |

## Skips

| ID | Reason |
|----|--------|
| | |

## Notes

- Prep / runner commands used (from repo docs — no secrets)
- Fixture restore done? yes/no
- Follow-ups: fix product · add automation · re-author Expected · open Spec questions

## Files updated

- `scenarios/…`
```

### Quality bar

- No tokens/passwords/session cookies  
- Every Fail has tag + enough evidence to reproduce  
- Do not claim GO if Fail > 0 unless user accepts known fails  
- Link scenario paths relatively inside the docs tree  
- Summary counts must match rows updated (no invented Pass totals)
