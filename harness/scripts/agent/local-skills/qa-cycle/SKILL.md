---
name: qa-cycle
description: >-
  Portable QA orchestration to a QA Gate READY|NOT READY before /ship: docs
  review, testcase author/run, discovered CI/smoke, then security/test fan-out
  (pre-ship only). Modes: docs-review, author, run, full-cycle, pre-ship.
  Discovers paths and commands per repo—no fixed product domain. Does not fix
  product bugs, write automated tests, or issue Ship GO/NO-GO.
---

# QA cycle

## Overview

Orchestrate QA evidence by **mode** in **any** repo that documents (or will bootstrap) product SoT + testcase docs. Only **`pre-ship`** produces a **QA Gate** (`READY` | `NOT READY`).

`/qa` ≠ `/ship`: this skill gathers evidence; `/ship` decides GO/NO-GO + rollback.

**Orchestrator:** main session under `/qa` (no router persona). Personas do not call other personas.

**Portable:** every command, path, smoke journey, timezone, and ops check comes from [references/repo-discovery.md](references/repo-discovery.md). Do not assume a domain, package manager, or monorepo layout.

## Standalone rule

Do not rely on prior chat. Read [references/repo-discovery.md](references/repo-discovery.md), fill the session table, then follow [references/modes.md](references/modes.md) and the mode workflow below. **Refuse** if discovery is incomplete for the chosen mode.

## Required reading

1. [references/repo-discovery.md](references/repo-discovery.md) — then discover  
2. [references/modes.md](references/modes.md) — mode table + default selection  
3. [references/oracle.md](references/oracle.md) — Expected vs as-built; Fail tags  
4. [references/pre-ship-checklist.md](references/pre-ship-checklist.md) — when mode is `pre-ship`  
5. [references/qa-gate-template.md](references/qa-gate-template.md) — when writing QA Gate  
6. [references/qa-run-template.md](references/qa-run-template.md) — when writing `full-cycle` report  
7. [references/review-template.md](references/review-template.md) — when writing docs review  
8. [references/handoff.md](references/handoff.md) — next-command routing (incl. `/reverse-contracts`)  

## Mode selection

If the user did not name a mode: ask once.  
Ship-readiness intent → **`pre-ship`** (see [modes.md](references/modes.md)).

| Mode | Fan-out security/test | Primary report |
|------|----------------------|----------------|
| `docs-review` | No | Discovered docs-review root |
| `author` | No | — (hop `testcase-authoring`) |
| `run` | No | scenario Result write-back |
| `full-cycle` | No | Discovered reports root → `qa-run-YYYY-MM-DD.md` |
| `pre-ship` | **Yes** (after functional) | Discovered reports root → `qa-gate-YYYY-MM-DD.md` |

## When to hop authoring

Hop **`testcase-authoring`** when **any** of:

1. Catalogue or scenarios root missing / empty  
2. Docs review lists coverage gaps that need new scenario IDs  
3. User named zones/IDs that have no rows yet  
4. Catalogue slot exists but the scenario file has **no data rows** (header-only)

Skip authoring when in-scope rows already exist and the user only wants execute / gate. Prefer stub for empty; deep/bug-hunt only if user asks or docs review demands it.

## When to hop reverse-engineer-contracts

Hop **`reverse-engineer-contracts`** (`/reverse-contracts`) when docs-review (or Conditional Pass DoD) needs **as-built fixes from code** — schema stubs, missing UI matrices, known-gaps overclaims, DESIGN↔code alignment after user picks A|B. Do not reverse-engineer inside `qa-cycle`; produce the review, then hop. Routing table: [references/handoff.md](references/handoff.md).

## Workflow by mode

### `docs-review`

1. Discover product + contracts + DoD paths.  
2. Spawn **`qa-contracts-auditor`** (or run checklist in main if persona unavailable).  
3. Write review under the **discovered** docs-review root using [review-template.md](references/review-template.md).  
4. Stop — do not author/run unless user expands scope.

### `author`

Discover, then hop **`testcase-authoring`** completely for the requested scope. Do not execute Results.

### `run`

Discover, then hop **`testcase-execution`** completely for the requested scope. Do not author new IDs.

### `full-cycle`

1. Docs: same as `docs-review` (verdict must be recorded; Conditional Pass is OK with open items listed).  
2. Author: hop `testcase-authoring` if [When to hop authoring](#when-to-hop-authoring) applies.  
3. Execute: hop `testcase-execution` → Result / Last run.  
4. Write **`qa-run-YYYY-MM-DD.md`** under the discovered reports root via [qa-run-template.md](references/qa-run-template.md) (**not** a QA Gate).  
5. **Do not** fan-out security/test.

### `pre-ship` (locked order)

Numbered steps below are the SoT (CI/smoke before persona fan-out).

| Step | Phase | Action |
|------|-------|--------|
| 1 | Docs | Spawn `qa-contracts-auditor` (parallel OK from start) → merge docs verdict |
| 2 | Author | Hop `testcase-authoring` if [When to hop authoring](#when-to-hop-authoring) applies |
| 3 | Execute | Hop `testcase-execution` → Result |
| 4 | Automation | Run **discovered CI** command(s) in discovered code zone(s); if `missing_automation` → recommend test-writing skill/command (do **not** write tests here) |
| 5 | Regression | Run **discovered** smoke list (browser/execution per Automated / RUNBOOK) |
| 6 | Fan-out | **Parallel** `security-auditor` + `test-engineer` on current diff/change; cite Results from steps 3–5 |
| 7 | Perf / A11y / Ops | [pre-ship-checklist.md](references/pre-ship-checklist.md) using discovered criteria (+ portable defaults) |
| 8 | Sign-off | Write `qa-gate-*.md` via [qa-gate-template.md](references/qa-gate-template.md) |

**Phase J (defect loop):** list open Fails/blockers + next command per [handoff.md](references/handoff.md) (build / test / author / `/reverse-contracts`). **Do not** fix product code or reverse-engineer contracts in the same `/qa` session.

## Overlap with `/ship`

- QA Gate must include security/test persona summaries + date (session timezone).  
- **Fresh evidence** (reuse without re-fan-out): latest `qa-gate-*.md` from **today in the session timezone** or age ≤ **24 hours**, **and** no material diff after the gate timestamp under **discovered** material paths (code zones + product oracle + in-scope scenarios). If either fails → re-run security/test fan-out in `/ship` or `/qa pre-ship`.  
- Still do **not** issue Ship GO/NO-GO from `/qa`.

## Do not

- Fix product bugs or edit Expected to match code  
- Implement missing automation (hand off to test-writing skill)  
- Persona → persona calls  
- Issue Ship GO/NO-GO or rollback plans (`/ship`)  
- Fan-out security/test in `full-cycle` or lighter modes  
- Hardcode domain journeys, package managers, or folder layouts  
- Reverse-engineer or patch as-built contracts inside `/qa` — produce the review, then hop `/reverse-contracts`  

## Done

- Mode completed with the correct report path (if any)  
- Open Failures listed with ID + short evidence (tags: `product` / `missing_automation` / `env`)  
- Docs review Recommend classifies gaps per [handoff.md](references/handoff.md) (as-built → `/reverse-contracts`)  
- If docs **Conditional Pass** / as-built DoD open → recommend `/reverse-contracts`, then `/qa` `docs-review` again  
- If `pre-ship` + READY → recommend `/ship`  
- If NOT READY / Fail → recommend build / test / author / `/reverse-contracts` as appropriate  

