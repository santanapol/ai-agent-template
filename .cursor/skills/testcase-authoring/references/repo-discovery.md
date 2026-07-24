# Repo discovery (testcase skills)

Run this **before** authoring or executing. Prefer what the repo documents; never invent stack-specific defaults.

## Algorithm

1. **Testcase SoT** — Look for `docs/test-cases/README.md` (or equivalent). Follow links to catalogue, `scenarios/`, RUNBOOK.  
2. **Testing conventions** — `docs/testing-guide.md`, root `AGENTS.md`, `harness/references/testing-patterns.md`, or whatever README points to.  
3. **Product oracle** — Specs (`docs/specs/` or paths AGENTS names), design docs, OpenAPI/API contracts. **Do not** treat validators/handlers as the oracle.  
4. **Code zones** — `harness.config.yaml` if present; else AGENTS / ask the user.  
5. **Automate runner** — `package.json` scripts (`test`, `ci`, …) and the testing guide. Do **not** assume a specific framework.  
6. **Prep** (DB, app URL, seed) — ops/runbook linked from the test-cases README or AGENTS. Do **not** assume ports or database products.  
7. **Missing SoT while authoring** — Ask 1–3 questions. If the user confirms creating docs from scratch, follow [bootstrap.md](bootstrap.md) before writing many scenarios.  
8. **Missing SoT while executing** — **Refuse**. Point to `testcase-authoring` (and its `references/bootstrap.md`). Do not invent Expected or scenario files here.

## Record for the session

Fill this table (do not invent paths). **Refuse to author or execute** until at least *Catalogue / scenarios root* is known (or the user explicitly confirms bootstrap **for authoring**). For execution, also require *Test runner command(s)* and *Prep / runbook* when Automated rows need them.

| Item | Found at |
|------|----------|
| Catalogue / scenarios root | |
| ID / PREFIX rules | |
| Product oracle paths | |
| Test runner command(s) | |
| Prep / runbook | |
| Report output path (if any) | |

## Anti-hardcoding

Do not embed as universal truth: project product names, fixed PREFIX lists, app paths, test framework names, DB ports, or timezones. Discover them per repo. Skill examples use a **fictional** shop-settings domain only (`ZZ` / `SHOP`).
