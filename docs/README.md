# Documentation index

Product and engineering docs live in different places — by design.

| What | Where | You edit when… |
|------|-------|----------------|
| **What to build** (PRD, API spec per service) | [`specs/`](./specs/) | Defining or changing a feature |
| **How to build** (domain rules) | [`../coding-standard/`](../coding-standard/) | Changing org-wide backend/auth/gateway/frontend/testing standards |
| **How agents verify** (checklists) | [`../references/`](../references/) | Synced from [agent-skills](https://github.com/addyosmani/agent-skills) — do not edit by hand |
| **Slash-command standards map** | [`../scripts/agent-skills-standards/`](../scripts/agent-skills-standards/) | Telling `/plan`, `/build`, etc. which `coding-standard/` files apply |

## Specs (`docs/specs/`)

Service-level specifications (`*-spec.md`) and supporting material. Link to `coding-standard/` paths from specs — do not duplicate full standards here.

## Related

- [Root README](../README.md) — repository zones and quick start
- [scripts/README.md](../scripts/README.md) — sync workflows
- [.cursor/USAGE.md](../.cursor/USAGE.md) — Cursor agent-skills SDLC
