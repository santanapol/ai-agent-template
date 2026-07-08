# Documentation index

Product and engineering docs live in different places — by design.

| What | Where | You edit when… |
|------|-------|----------------|
| **Agent map (start here)** | [`../AGENTS.md`](../AGENTS.md) | Changing repo orientation for agents |
| **What to build** (PRD, API spec per service) | [`specs/`](./specs/) | Defining or changing a feature |
| **Execution plans** | [`exec-plans/`](./exec-plans/) | Multi-step or cross-service work |
| **Golden principles** | [`golden-principles.md`](./golden-principles.md) | Encoding mechanical invariants |
| **Quality score** | [`QUALITY_SCORE.md`](./QUALITY_SCORE.md) | After audits or `/gc` |
| **Observability** | [`observability.md`](./observability.md) | Changing logs/metrics stack |
| **Harness (how we work)** | [`../harness-engineering/README.md`](../harness-engineering/README.md) | Beliefs, skills ↔ harness |
| **Core beliefs** | [`../harness-engineering/core-beliefs.md`](../harness-engineering/core-beliefs.md) | หลักการที่ไม่ควรฝ่าฝืน |
| **How to build** (domain rules) | [`../coding-standard/`](../coding-standard/) | Changing org-wide backend/auth/gateway/frontend/testing standards |
| **How agents verify** (checklists) | [`../references/`](../references/) | Synced from [agent-skills](https://github.com/addyosmani/agent-skills) — do not edit by hand |
| **Slash-command standards map** | [`../scripts/agent-skills-standards/`](../scripts/agent-skills-standards/) | Telling `/plan`, `/build`, etc. which `coding-standard/` files apply |

## Specs (`docs/specs/`)

Service-level specifications (`*-spec.md`) and supporting material. Link to `coding-standard/` paths from specs — do not duplicate full standards here.

## Exec plans (`docs/exec-plans/`)

Active/completed work and tech debt — see [exec-plans/README.md](./exec-plans/README.md).

## Related

- [Root RUNBOOK](../RUNBOOK.md) — local boot, seed, smoke, CI (start here)
- [Root README](../README.md) — repository zones and quick start
- [scripts/README.md](../scripts/README.md) — sync workflows
- [.cursor/USAGE.md](../.cursor/USAGE.md) — Cursor agent-skills SDLC
- [.claude/USAGE.md](../.claude/USAGE.md) — Claude Code agent-skills SDLC
