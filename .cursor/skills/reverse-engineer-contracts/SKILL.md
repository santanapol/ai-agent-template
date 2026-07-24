---
name: reverse-engineer-contracts
description: >-
  Reverse-engineers running application code into an as-built contracts package
  (domain, API, UI, errors, ops, known-gaps). Use when documenting what the
  system actually does, bootstrapping or refreshing contracts-style docs,
  auditing drift vs design/product, or closing QA Conditional Pass items on
  contracts. Not for greenfield product specs, scenario testcase authoring,
  or QA Gate GO/NO-GO.
---

# Reverse-engineer contracts

## Overview

Produce **as-built** documentation from **running code** (handlers, serializers, validators, UI). As-built answers “what does the system do today?” Product specs answer “what should it do?” — keep them separate.

| Layer | Question | Typical location |
|-------|----------|------------------|
| Product specs | Expected / why / Testable AC | `{docs}/specs/*.md` |
| Contracts (this skill) | As-built behavior | `{docs}/specs/contracts/` |
| Design / ERD / stack | Visual & data design docs | `{docs}/design-docs/` (or repo map) |

**Code wins** for as-built. Drift vs design or product → [`known-gaps`](templates/known-gaps.md), do not silently overwrite Expected.

**Does not:** write QA Pass/Fail reviews, run scenario Result columns, implement features, or author greenfield product specs.

## Standalone rule

Do not rely on prior chat. Read [references/repo-discovery.md](references/repo-discovery.md), fill the discovery table, then follow [references/workflow.md](references/workflow.md). **Refuse** if code zone and docs root are unknown. If scope is missing, ask 1–3 questions.

## Modes

| Mode | When |
|------|------|
| **Bootstrap** | No contracts package (or empty) → copy [templates/](templates/) then fill from code |
| **Audit / refresh** | Package exists → field/route/UI audit against code |
| **QA follow-up** | Conditional Pass / open DoD in a contracts review → [qa-follow-up.md](references/qa-follow-up.md) |

**Default:** Bootstrap if package missing; QA follow-up if user points at a review; otherwise Audit.

## Required reading

1. [references/repo-discovery.md](references/repo-discovery.md) — then discover  
2. [references/document-kinds.md](references/document-kinds.md)  
3. [references/workflow.md](references/workflow.md)  
4. Templates under [templates/](templates/) when creating or resetting structure  
5. [references/qa-follow-up.md](references/qa-follow-up.md) when mode is QA follow-up  
6. [references/handoff.md](references/handoff.md) when hopping to/from other skills  

## Workflow (summary)

1. Discover docs root, code zones, actors, existing SoT ([repo-discovery.md](references/repo-discovery.md)).  
2. Choose mode.  
3. **Bootstrap:** copy templates → rename actor API/UI files → fill from code.  
4. **Audit:** compare handlers / serializers / request validators / UI to contracts; patch schemas and matrices; append audit log.  
5. Apply **conditional steps** in [workflow.md](references/workflow.md) (Testable AC, deprecate legacy API, DESIGN A|B, `schema-audit`).  
6. Record gaps in `known-gaps.md`.  
7. Done checklist for the mode; hand off per [handoff.md](references/handoff.md).

## Template structure

When copying [templates/](templates/), **keep required section headings** (see [document-kinds.md](references/document-kinds.md) and each template). Rename only actor filenames (e.g. `{actor}.openapi.yaml`, `ui/{actor}.md`). Do not invent a parallel outline.

## Do not

- Write `review-*.md` Pass/Fail or QA Gate → `qa-cycle` (`/qa`)  
- Author scenario catalogue / Result runs → `testcase-authoring` / `testcase-execution`  
- Greenfield product “should be” from intent only → `/spec`  
- Sync an entire legacy OpenAPI file over as-built without deprecate-as-SoT  
- Change product Expected to match buggy code  
- Hardcode a product domain, stack, or project name into new contracts without discovery  
- Invent API fields not present in code  

## Done checklists

**Bootstrap:** package tree exists · README SoT matrix filled · domain + ≥1 actor API + ≥1 UI surface · known-gaps started · as-built-of date set  

**Audit:** changed endpoints/fields reconciled · audit log row(s) · gaps updated · Redocly/lint if repo has it  

**QA follow-up:** each open DoD item closed or explicitly deferred with gap ID · review follow-up note updated if a review file was in scope · recommend `/qa` `docs-review`  
