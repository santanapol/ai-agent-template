---
name: testcase-run
description: Execute scenario testcases — run per Automated column, write Result/Last run/optional reports
disable-model-invocation: true
---

Read and follow **testcase-execution** (`.cursor/skills/testcase-execution/SKILL.md`) completely — including `harness/references/` (repo discovery, run order, result rules).

## Scope

- Run existing scenario rows only (discover prep + runner from this repo’s docs)
- Write **Result**, **Last run**, **Run summary**; reports only if the user asks
- Oracle = Expected / product SoT — if code differs, mark **Fail** (do not rewrite Expected)

## Do not

- Author new cases or change Expected to match code → `/testcase-author`
- Implement missing automated tests → `/test`
- Fix product code on Fail → report evidence; user may `/build`

Guide: `docs/test-cases/README.md` / RUNBOOK (when present) · skill refs under `.cursor/skills/testcase-execution/references/`
