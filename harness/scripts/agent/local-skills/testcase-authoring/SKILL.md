---
name: testcase-authoring
description: >-
  Author portable testcase docs for any repo: catalogue slots, scenario slices,
  stub/deep rounds, and adversarial bug-hunt against specs and contracts—not
  against current code. Self-contained technique and template references. Use
  when creating or expanding testcases, filling coverage maps, stub/deep/bug-hunt
  rounds, or writing scenario docs. Works with no prior chat—run repo discovery
  then skill references; ask scope if missing. Does not run the test suite or
  write Result columns.
---

# Testcase authoring

## Overview

Write **testcase documentation** (catalogue + scenario slices) that survives any product domain or tech stack. Expected behavior comes from **product SoT** (specs, contracts, UI design)—never from mirroring current validators or handlers.

**Does not:** run tests as the main job, fill Result columns, implement automated tests, or fix product bugs.

**After docs are ready to automate:** hand off to `test-driven-development` (or the repo’s test-writing skill). Do not author automated tests in this skill.

## Standalone rule

Do not rely on prior chat. Read [references/repo-discovery.md](references/repo-discovery.md), discover the target repo and fill the discovery table, then read the mode references below. **Refuse** if scenarios root is unknown (unless the user confirms bootstrap). If scope is missing, ask 1–3 questions.

## Modes

| Mode | When | Round / note |
|------|------|----------------|
| **A — Stub** | Empty slots/files, or user wants coverage map first | `stub` |
| **B — Deep** | Stub exists; expand from product SoT | `deep` |
| **C — Bug-hunt** | User asks bug-hunt / distrust code / find gaps after mirror-style deep | `deep` + bug-hunt notes |

**Default:** Stub if no rows yet; **C** if deep already exists and user talks about finding bugs; otherwise ask one clarifying question.

## Required reading (before writing)

1. [references/repo-discovery.md](references/repo-discovery.md) — then discover in the repo  
2. If SoT missing and user confirms create-from-scratch → [references/bootstrap.md](references/bootstrap.md)  
3. [references/id-and-columns.md](references/id-and-columns.md)  
4. [references/techniques.md](references/techniques.md)  
5. [references/levels-automated.md](references/levels-automated.md)  
6. [references/scenario-template.md](references/scenario-template.md)  
7. Mode pack:  
   - A → [references/examples-stub.md](references/examples-stub.md)  
   - B → [references/examples-deep.md](references/examples-deep.md)  
   - C → [references/bug-hunt.md](references/bug-hunt.md) + [references/examples-bug-hunt.md](references/examples-bug-hunt.md)  

Prefer the repo’s `_template` under its test-cases tree when present and compatible; otherwise use this skill’s scenario template.

## Workflow

1. Discover testcase SoT, product oracle, and conventions ([repo-discovery.md](references/repo-discovery.md)).  
2. Choose mode A / B / C.  
3. Author or expand scenario files; leave **Result** empty.  
4. Update catalogue slot status when the repo has a catalogue.  
5. Done checklist for the mode (below).  
6. If rows are marked for automation, tell the user to use TDD / the repo test skill so each ID appears in automated test titles per the repo guide—do not implement tests here.

## Bug-hunt (mode C) — non-negotiable

Full rules: [references/bug-hunt.md](references/bug-hunt.md).

- Oracle = external SoT, not implementation.  
- Read code only to find **gaps**, not to copy rules into Expected.  
- Reject validator-mirror cases.  
- Prefer cross-layer cases (UI ↔ API ↔ contract ↔ auth/persistence).  

## Do not

- Run the suite or write Result / Last run / reports (that is `testcase-execution`)  
- Change Expected to match buggy code  
- Fix product code (point to `/build` or the repo’s fix workflow)  
- Hardcode a project name, runner, ports, or PREFIX table into new docs without discovering them from the repo  

## Done checklists

**Stub:** catalogue slots no longer empty for the slice · scenario file(s) with main rows · Automated filled · Result blank · Round `stub`

**Deep:** Test data / fixture filled · techniques applied from SoT · Round `deep`

**Bug-hunt:** ≥1 cross-layer row (or documented N/A) · silent-behavior coverage where relevant · Expected cites SoT · no validator-mirror-only rows · catalogue updated if needed
