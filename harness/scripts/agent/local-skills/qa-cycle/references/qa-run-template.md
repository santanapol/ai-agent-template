# QA run report template (`full-cycle`)

Write to: `<discovered-testcase-reports-root>/qa-run-YYYY-MM-DD.md`

This is a **functional summary**, not a QA Gate. No READY/NOT READY. No security/test fan-out.

```markdown
# QA run — YYYY-MM-DD

**Mode:** full-cycle  
**Orchestrator:** /qa (qa-cycle)  
**Timezone:** <from discovery>

## Docs

| Verdict | Review path |
|---------|-------------|
| Pass / Conditional Pass / Fail | <path if written this run> |

## Scenarios

| Zone / file | Pass | Fail | Skip | Notes |
|-------------|-----:|-----:|-----:|-------|
| | | | | |

**Fail tags** (from `testcase-execution`): `product=N` · `missing_automation=N` · `env=N`

## Open items

| ID / item | Tag | Evidence | Next command |
|-----------|-----|----------|--------------|
| | product / missing_automation / env / docs | | build · test · author · spec |

## Next

- Need ship gate → `/qa pre-ship`
- Fix product → build workflow
- Missing tests → test-writing workflow
```

## Rules

- Counts must match scenario Result write-backs for in-scope rows.
- Do not claim READY/NOT READY in this file.
- Docs Fail or Conditional Pass with P0 → list under Open items; still finish the run summary.
