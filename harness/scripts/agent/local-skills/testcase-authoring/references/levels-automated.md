# Levels and Automated column

## Pyramid (docs at the base)

```text
        /\
       /E2E\          Few critical UI paths
      /------\
     / Integr.\       Most behavior (API + real deps as repo defines)
    /----------\
   /    Unit    \     Pure rules / small functions
  /--------------\
 /  Testcase docs \   SoT: IDs · fixtures · Expected
```

Testcase docs are **not** a CI execution layer. Execution starts at unit (or whatever the repo’s guide says).

## Automated values

| Value | Meaning |
|-------|---------|
| `unit` | Isolated unit test |
| `integration` | Broader automated test (API, DB, etc. per repo) |
| `e2e` | Browser or full-stack UI automation |
| `manual` | Human / agent browser steps in the scenario |
| `deferred` | Intentionally not run yet (note why in Case/Notes) |
| `partial` | Some aspects automated; note what remains manual |

Discover **where** tests live and **which command** runs them from the repo ([repo-discovery.md](repo-discovery.md)). Do not hardcode framework or folders unless the repo already uses them.

## Choosing a level (heuristic)

| Case kind | Prefer | Avoid |
|-----------|--------|-------|
| Pure parse/format/range with no I/O | `unit` | Forcing e2e |
| API + persistence + auth | `integration` | Duplicating only in unit against the same schema as oracle |
| UI-only affordance API cannot see | `e2e` or `manual` | Claiming integration covers it |
| Not ready / blocked | `deferred` | Silent empty Automated |

Always defer to the repo **testing-guide** when it conflicts with this heuristic.

## Rules

1. **Each level picks cases; it does not invent new requirements.** Point Expected at Spec/FR.  
2. Completeness = catalogue/slot status + every ID has Automated — not raw count of automated tests.  
3. IDs marked for automation must later appear in automated test titles per the repo testing guide.  
4. Prefer thickness in the middle of the pyramid unless the repo’s guide says otherwise.  
5. Authoring fills Automated; **Result** is execution-only.  
