# Run order

## Prep

1. Complete [repo-discovery.md](repo-discovery.md) execute-first table.  
2. Read prep from RUNBOOK / ops (services, seed, health, app URL).  
3. Match scenario **Env** — or Skip blocked rows with reason.  
4. If prep fails → **stop the run** or Skip only the blocked rows; never mark Pass.  
5. Do **not** invent ports, DB engines, or package managers.

## Stop policy

| Policy | Default |
|--------|---------|
| **Continue on Fail** | **Yes** — finish in-scope rows so the summary is complete |
| **Stop entire zone on first Fail** | Only if user or RUNBOOK says so |
| **Stop on prep failure** | **Yes** for rows that need that prep |

Record any early stop in the report/Notes.

## Automated layers

Default order (skip unused layers):

| Step | Automated value | Action |
|------|-----------------|--------|
| 1 | `unit` | Discovered unit command |
| 2 | `integration` | Discovered integration command |
| 3 | `e2e` | Discovered e2e/browser command |
| 4 | `manual` | Scenario / RUNBOOK steps; judge vs Expected |
| 5 | `deferred` | **Skip** + reason |
| 6 | `partial` | See below |

Prefer **layer-first across a zone** (all unit → all integration → …) unless RUNBOOK says per-file.

### `partial` rows

1. Run the automated portion; record outcome.  
2. Complete the manual remainder against Expected.  
3. Result rules:  
   - Both parts meet Expected → **Pass**  
   - Either part fails Expected → **Fail** (note which part)  
   - Automated missing but manual done → **Fail** (missing automation) unless Notes say Skip  
   - Blocked mid-way → **Skip** + reason  

### Matching tests to IDs

ID in automated test title (or repo guide rule).

| Situation | Default Result |
|-----------|----------------|
| Matching test Pass / behavior matches Expected | **Pass** |
| Matching test Fail / behavior ≠ Expected | **Fail** (+ evidence) |
| No matching test for automated ID | **Fail** (`missing_automation`) for deep/bug-hunt; Skip only if Notes/policy say so |
| Bundled test covers many IDs | Same Result each; note “bundled with …” |

## Multi-file / zone scope

| User said | Scope |
|-----------|--------|
| Zone name (e.g. `settings`) | All scenario files in that folder (catalogue order if any) |
| One file | That file |
| ID list / range | Those IDs only |

## Manual discipline

- Follow **Case**; oracle is **Expected**, not “UI looks fine.”  
- Evidence on Fail: what you saw vs Expected (screenshot path optional if the environment supports it — do not require a specific tool).  
- Do not author new rows mid-run → `testcase-authoring`.  
- Restore fixtures when RUNBOOK requires (especially after destructive manuals).  

## After the run

1. Write Results ([result-rules.md](result-rules.md)).  
2. Update Last run + Run summary per touched file.  
3. Restore fixtures if required.  
4. Report ([report-template.md](report-template.md)) **only if asked**.  

Narrative: [examples-run.md](examples-run.md)
