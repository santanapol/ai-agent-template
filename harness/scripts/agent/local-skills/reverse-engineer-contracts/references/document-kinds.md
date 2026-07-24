# Document kinds

Artifacts this skill may create or update. Default root: `{docs}/specs/contracts/` (after discovery).

## Primary (as-built)

| Kind | Path convention | Role |
|------|-----------------|------|
| Index | `README.md` | SoT matrix, tree, rules |
| Domain | `domain.md` | Enums, transitions, invariants, outcomes |
| API shared | `api/_components.openapi.yaml` (or shared types module / SDL commons) | Shared schemas / errors |
| API actor | `api/{actor}.openapi.yaml` (or per-actor API doc) | Operations for one actor |
| UI surface | `ui/{actor}.md` | Purpose, states, fields, CTA, APIs |
| Known gaps | `known-gaps.md` | Drift vs design / product / legacy |
| Error catalogue | `error-catalogue.md` | Code · meaning · actor · HTTP |
| Ops surfaces | `ops-surfaces.md` | Auth, jobs, side paths outside API ops |

## Secondary (when workflow conditions fire)

| Kind | Where | Rule |
|------|-------|------|
| Testable AC | Product spec `## Testable acceptance criteria` | ≤ 8 Given/When/Then per file; do not replace whole Success Criteria |
| Legacy API deprecate | Existing design OpenAPI / API narrative | Banner + point to contracts; do not full-sync content |
| DESIGN align (path A) | Design docs | Only after user chooses A (docs) vs B (code) |
| ERD / schema notes | Existing ERD doc | `schema-audit` step; do not move ERD into contracts by default |

## Out of scope (other skills)

| Kind | Skill |
|------|-------|
| Scenario testcases / catalogue / Result | `testcase-authoring` / `testcase-execution` |
| QA review Pass/Fail / QA Gate | `qa-cycle` |
| Greenfield product spec | `/spec` |
| Runtime feature code | `/build` |

## Template headings

Required H1/H2 (or YAML `info`/`components`) in [templates/](../templates/) are part of the contract. Agents may add subsections but must not remove or rename the mandated headings when copying.
