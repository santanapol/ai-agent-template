# Repo discovery (qa-cycle)

Run **before** any mode. Prefer what the repo documents. **Never** invent product names, ports, frameworks, package managers, timezones, or smoke journeys.

## Algorithm

1. **Agent / docs map** — `AGENTS.md`, root `README`, `.cursor/USAGE.md` if present.  
2. **Product oracle** — paths named for specs / FR / Testable AC (often under `docs/specs/`).  
3. **As-built / contracts** — API or behavior contracts if the repo separates them from product specs.  
4. **Docs DoD for QA** — any product-completeness / QA readiness guide under contracts or testing docs. If none → judge with [review-template.md](review-template.md) generic questions only.  
5. **Testcase SoT** — catalogue, scenarios, RUNBOOK (see `testcase-authoring` / `testcase-execution` discovery).  
6. **Testing guide** — CI / test commands, layers.  
7. **Code zones** — `harness.config.yaml` → `code.*`, or AGENTS / ask.  
8. **App CI command(s)** — exact scripts from testing guide or package manifests in those zones (e.g. `ci`, `test`, `lint`). Do **not** assume `pnpm` / `npm` / a folder name.  
9. **Docs lint / harness gates** — any documented docs-lint or contract lint commands.  
10. **Regression smoke** — journeys listed in RUNBOOK / testing guide / catalogue “smoke” section. If none → ask once or Skip smoke with reason.  
11. **Perf / A11y / Ops criteria** — from testing guide, ops runbook, ADRs, or contracts ops surfaces. If none → use only the **portable defaults** in [pre-ship-checklist.md](pre-ship-checklist.md) and Skip rows that need repo-specific evidence.  
12. **Timezone** — from runbook / Env column / AGENTS. Else **UTC** and state it.  
13. **Report roots** — where scenario reports and docs reviews should land (testing guide or test-cases README). If silent, ask once before writing files.

## Session table (fill — do not invent)

| Item | Required when | Found at |
|------|---------------|----------|
| Product oracle paths | Always | |
| Contracts / as-built paths | `docs-review`, `full-cycle`, `pre-ship` | |
| Docs DoD guide (if any) | docs review | |
| Catalogue / scenarios root | `author`, `run`, `full-cycle`, `pre-ship` | |
| Prep / RUNBOOK | `run`, `full-cycle`, `pre-ship` | |
| Code zone(s) + **CI command(s)** | `pre-ship` | |
| Docs-lint / harness gate command(s) | when writing under docs / `pre-ship` | |
| Regression smoke list | `pre-ship` | |
| Perf / A11y / Ops criteria sources | `pre-ship` | |
| Session timezone | any report | |
| Report output roots | modes that write reports | |
| Material paths for “fresh” gate reuse | after `pre-ship` / before `/ship` | code zones + product oracle + testcase root |

**Refuse** if the mode needs an item above and it cannot be discovered — point to `testcase-authoring` (bootstrap) or ask 1–3 questions. Do not invent Expected or verdicts without evidence.

## Anti-hardcoding

Do **not** treat as universal truth: product domain names, fixed UI routes, payment vendors, DB products, package managers, monorepo folder layout, or a specific city timezone.

## Hop discovery

- Author → `testcase-authoring` `references/repo-discovery.md`  
- Execute → `testcase-execution` `references/repo-discovery.md`  
