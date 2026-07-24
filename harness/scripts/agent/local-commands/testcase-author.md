---
name: testcase-author
description: Author testcase docs — catalogue slots, scenario slices, stub/deep/bug-hunt (not Result runs)
disable-model-invocation: true
---

Read and follow **testcase-authoring** (`.cursor/skills/testcase-authoring/SKILL.md`) completely — including `.cursor/skills/testcase-authoring/references/` (repo discovery, techniques, bug-hunt).

## Scope

- Catalogue slots and scenario markdown under the repo’s test-cases tree (discover paths; do not invent stack defaults)
- Modes: stub · deep · **bug-hunt** (distrust code; oracle = specs/contracts/UI — not validators)
- Leave **Result** blank; do not run the suite as the main job

## Do not

- Fill Result / Last run / reports → use `/testcase-run`
- Implement automated tests → use `/test` (`test-driven-development`)
- Fix product bugs → `/build` after Fail from a run

Guide: `docs/test-cases/README.md` (when present) · skill refs under `.cursor/skills/testcase-authoring/references/`
