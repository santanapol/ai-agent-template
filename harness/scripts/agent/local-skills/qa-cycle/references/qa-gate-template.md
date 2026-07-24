# QA Gate report template

Write to: `<discovered-testcase-reports-root>/qa-gate-YYYY-MM-DD.md`

```markdown
# QA Gate — YYYY-MM-DD

**Mode:** pre-ship  
**Orchestrator:** /qa (qa-cycle)  
**Timezone:** <from discovery>  
**Verdict:** READY | NOT READY

## Discovery (session)

| Item | Value |
|------|-------|
| CI command(s) | |
| Smoke list | |
| Material paths (fresh check) | |

## Summary

| Dimension | Result | Notes |
|-----------|--------|-------|
| Docs | Pass / Conditional Pass / Fail | link to review-*.md |
| Functional scenarios | Pass / Fail / partial | N pass / N fail / N skip |
| Automation (CI) | Pass / Fail / Skip | |
| Regression smoke | Pass / Fail / Skip | |
| Security (`security-auditor`) | Pass / Fail / Skip | date + short summary |
| Test quality (`test-engineer`) | Pass / Fail / Skip | date + short summary |
| Perf | Pass / Skip | |
| A11y | Pass / Skip | |
| Ops | Pass / Skip | |

## Persona evidence (for /ship reuse)

| Persona | Date | Summary path or inline notes |
|---------|------|------------------------------|
| security-auditor | | |
| test-engineer | | |

> **Fresh for `/ship` reuse:** gate date is today (session TZ) or age ≤ 24h, **and** no material diff after gate under discovered material paths. Otherwise re-fan-out.

## Open blockers

| ID / item | Tag | Evidence | Next command |
|-----------|-----|----------|--------------|
| | product / missing_automation / env / docs | | build · test · author · reverse-contracts |

## Recommend

- If **READY** → run `/ship` for GO/NO-GO + rollback
- If **NOT READY** → clear blockers first; do not treat this file as Ship GO
- Docs as-built gaps (contracts ≠ code) → `/reverse-contracts`, then `/qa` `docs-review` / re-gate — see qa-cycle `references/handoff.md`
```

## READY rules

**READY** only if:

- Docs is Pass or Conditional Pass with **no** P0/ship-blocking open items
- No open `product` Fails in scoped critical paths (or user explicitly accepted residual risk — record it)
- Discovered CI Pass (or explicit Skip with accepted reason if repo has no CI)
- Security and test-engineer are Pass or explicit Skip with accepted reason
- Perf / A11y / Ops are Pass or Skip + reason (not blank)

Otherwise **NOT READY**.
