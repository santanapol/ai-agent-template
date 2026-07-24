# Contracts — As-built API & UI

**as-built-of:** {as-built-of}  
**Timezone / locale:** {timezone-or-locale}  

As-built contracts for this system — not product “why” specs and not visual design SoT.

## Tree

```text
{contracts_root}/
  README.md
  domain.md
  known-gaps.md
  error-catalogue.md
  ops-surfaces.md
  api/
    _components.openapi.yaml
    {actor}.openapi.yaml
  ui/
    {actor}.md
```

## How to read

| Need | Prefer |
|------|--------|
| Domain enums / transitions / invariants | [`domain.md`](./domain.md) |
| HTTP for {Actor} | [`api/{actor}.openapi.yaml`](./api/{actor}.openapi.yaml) |
| Shared schemas | [`api/_components.openapi.yaml`](./api/_components.openapi.yaml) |
| UI behavior + fields | [`ui/{actor}.md`](./ui/{actor}.md) |
| Error codes | [`error-catalogue.md`](./error-catalogue.md) |
| Auth / jobs / side paths | [`ops-surfaces.md`](./ops-surfaces.md) |
| Drift vs design / product / legacy | [`known-gaps.md`](./known-gaps.md) |
| Product Expected | product specs (see repo AGENTS / docs map) |
| Legacy API archive (if any) | {legacy-api-path} |

## Rules

- Believe **code** as as-built; this package mirrors code.
- If this conflicts with design docs or product specs → record in [`known-gaps.md`](./known-gaps.md); do not silently overwrite Expected.
- Declare a single HTTP as-built winner (this package). Deprecate duplicate API docs as SoT rather than full-syncing them here.
- Auth and job paths that are not business API operations belong in [`ops-surfaces.md`](./ops-surfaces.md) (and securitySchemes if applicable).
