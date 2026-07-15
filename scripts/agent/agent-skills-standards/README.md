# Related Coding Standards (per slash command)

Appended to upstream commands by [`../sync-agent-skills.sh`](../sync-agent-skills.sh).

Edit these files only — `.cursor/commands/` is regenerated each sync.

| File | Command |
|------|---------|
| `spec.md` | `/spec` |
| `plan.md` | `/plan` |
| `build.md` | `/build` |
| `test.md` | `/test` |
| `review.md` | `/review` |
| `webperf.md` | `/webperf` |
| `ship.md` | `/ship` |
| `code-simplify.md` | `/code-simplify` |

`code-build` reuses `build.md` standards.

## Shared fragments

| File | Used by |
|------|---------|
| `_shared-spec-plan.md` | `spec.md`, `plan.md` via `@include` |

## Path conventions

- Domain standards: `coding-standard/<domain>/...`
- Testing standards: `knowledge/software-testing/<topic>/README.md`
- Files prefixed with `_` are includes only — not appended directly
