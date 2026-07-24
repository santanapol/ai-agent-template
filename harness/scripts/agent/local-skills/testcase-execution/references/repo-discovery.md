# Repo discovery (execution)

Run **before** executing. Prefer what the repo documents; never invent stack-specific defaults.

This skill **runs** existing scenarios. It does **not** create catalogue/scenario trees (that is `testcase-authoring` → `references/bootstrap.md`).

## Execute-first checklist

Fill before touching Results:

| Item | Required? | Found at |
|------|-----------|----------|
| Catalogue / scenarios root | **Yes** | |
| Target files or zone / ID list | **Yes** (from user or catalogue) | |
| Test runner command(s) | **Yes** if any `unit`/`integration`/`e2e` rows | |
| Prep / runbook | **Yes** if Env needs services/DB/seed | |
| Product oracle paths | Optional (for judging vague Expected) | |
| Report output path | Only if user asked for a report | |

**Refuse** if scenarios root is unknown, target has no rows / no Automated column, or runner/prep required by those rows cannot be discovered. Point to `testcase-authoring` (bootstrap if docs missing). Do **not** invent Expected or scenario files.

## Where to look (hints, not hard requirements)

1. `docs/test-cases/README.md` → catalogue, `scenarios/`, RUNBOOK  
2. `docs/testing-guide.md` / `AGENTS.md` / `harness/references/testing-patterns.md`  
3. `package.json` scripts (`test`, `ci`, …) — record the **exact** commands you will run  
4. Ops/runbook linked from test-cases or AGENTS — ports/DB only as documented  

## Command recording pattern (no framework assumed)

In the session notes, copy what the repo documents, for example:

```text
unit:        <path or script from testing-guide>
integration: <path or script from testing-guide>
e2e:         <path or script if any>
cwd:         <package root from discovery>
```

Do not invent Vitest/Jest/Playwright/etc. If the guide is silent, ask once.

## Anti-hardcoding

No universal product names, PREFIX tables, app paths, frameworks, ports, or timezones. Examples in this skill use fictional `ZZ` / `SHOP` only.
