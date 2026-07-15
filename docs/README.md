# Documentation index

Product and engineering docs live in different places — by design.

| What | Where | You edit when… |
|------|-------|----------------|
| **Agent map (start here)** | [`../AGENTS.md`](../AGENTS.md) | Changing repo orientation for agents |
| **What to build** (PRD, API spec per service) | [`specs/`](./specs/) | Defining or changing a feature |
| **Execution plans** | [`exec-plans/`](./exec-plans/) | Multi-step or cross-service work |
| **Golden principles** | [`golden-principles.md`](./golden-principles.md) | Encoding mechanical invariants |
| **ADRs (platform)** | [`adrs/`](./adrs/) | Cross-cutting architecture decisions (schema, validators) |
| **Quality score** | [`QUALITY_SCORE.md`](./QUALITY_SCORE.md) | After audits or `/gc` |
| **Observability** | [`observability.md`](./observability.md) | Changing logs/metrics stack |
| **Harness (how we work)** | [`../knowledge/harness/README.md`](../knowledge/harness/README.md) | Beliefs, skills ↔ harness |
| **Template conventions** | [`TEMPLATE.md`](./TEMPLATE.md) | Repo skeleton, zones, forbidden paths, service bootstrap |
| **Core beliefs** | [`../knowledge/harness/core-beliefs.md`](../knowledge/harness/core-beliefs.md) | หลักการที่ไม่ควรฝ่าฝืน |
| **How to build** (domain rules) | [`../coding-standard/`](../coding-standard/) | Backend/auth/gateway/frontend standards |
| **Testing standards** | [`../knowledge/software-testing/`](../knowledge/software-testing/) | Testing levels 00–12 |
| **How agents verify** (checklists) | [`../references/`](../references/) | Synced from [agent-skills](https://github.com/addyosmani/agent-skills) — do not edit by hand |
| **QA code audit** (draft manual) | [`qa/qa-code-audit-common.md`](./qa/qa-code-audit-common.md) + [backend](./qa/qa-code-audit-backend.md) + [frontend](./qa/qa-code-audit-frontend.md) | Bug-hunt workflow — spec as SoT, not code; split BE/FE for separate skills; intent in [`intent/qa-code-audit-skill.md`](./intent/qa-code-audit-skill.md) |
| **Slash-command standards map** | [`../scripts/agent/agent-skills-standards/`](../scripts/agent/agent-skills-standards/) | Telling `/plan`, `/build`, etc. which `coding-standard/` files apply |

## Specs (`docs/specs/`)

Service-level specifications (`*-spec.md`) and supporting material. Link to `coding-standard/` paths from specs — do not duplicate full standards here.

### Backend service specs

| Service | Spec |
|---------|------|
| auth | [auth-spec.md](./specs/backend/auth/auth-spec.md) |
| gateway | [gateway-spec.md](./specs/backend/gateway/gateway-spec.md) |
| staff | [staff-spec.md](./specs/backend/staff/staff-spec.md) |
| demo-service | [demo-service-spec.md](./specs/backend/demo-service/demo-service-spec.md) |
| agent-invoice | [agent-invoice-spec.md](./specs/backend/agent-invoice/agent-invoice-spec.md) |
| smart-report | [smart-report-spec.md](./specs/backend/smart-report/smart-report-spec.md) |
| branch-report | [branch-report-spec.md](./specs/backend/branch-report/branch-report-spec.md) |

## Exec plans (`docs/exec-plans/`)

Active/completed work and tech debt — see [exec-plans/README.md](./exec-plans/README.md).

## RUNBOOK layering

Three RUNBOOKs, three scopes — read top-down, deeper only if the layer above doesn't answer your question:

| Layer | File | Scope |
|-------|------|-------|
| 1. Local dev (start here) | [`../RUNBOOK.md`](../RUNBOOK.md) | Boot the whole stack via harness, seed, smoke, CI, day-to-day troubleshooting |
| 2. Backend manual + deploy | [`../backend/RUNBOOK.md`](../backend/RUNBOOK.md) | Per-service manual setup without the harness, JWT/roles deploy checklist — assumes layer 1 doesn't cover your case |
| 3. Staging server | [`../dev-ops/staging/RUNBOOK.md`](../dev-ops/staging/RUNBOOK.md) | SSH deploy on staging host (nginx, PM2) |
| 4. Production server | [`../dev-ops/prod/RUNBOOK.md`](../dev-ops/prod/RUNBOOK.md) | SSH deploy on prod host — `scripts/prod/deploy-prod.sh` |

Don't duplicate content across layers — link to the layer that owns it instead.

## Related

- [Root RUNBOOK](../RUNBOOK.md) — local boot, seed, smoke, CI (start here)
- [Root README](../README.md) — repository zones and quick start
- [scripts/README.md](../scripts/README.md) — sync workflows
- [.cursor/USAGE.md](../.cursor/USAGE.md) — Cursor agent-skills SDLC
- [.claude/USAGE.md](../.claude/USAGE.md) — Claude Code agent-skills SDLC
