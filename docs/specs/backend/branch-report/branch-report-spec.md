---
status: implemented
created: 2026-07-03
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 39/39 files
---

# Spec: Branch Report Service

## Objective

**Branch Report** — read-only marketing analytics บน shared branch MongoDB (`MONGODB_DB_BRANCH`): affiliate invite links dropdown และ Royalty 21 Times per-member report

**OBSERVED** modules: `invite-links`, `royalty-21-times`

## Consumers

- **backoffice** / **backoffice-shadcn** — branch marketing reports UI
- **gateway** — `/api/v1/branch-report/*` → `:3015`

## Source of Truth

| หัวข้อ | SoT |
|--------|-----|
| Business | [business-domain.md](./business-domain.md) |
| Technical | [technical-architecture.md](./technical-architecture.md) |
| Persistence (read-only) | [database-erd.md](./database-erd.md) |
| HTTP | [openapi.yaml](../../../../backend/service/branch-report/openapi.yaml) |
| Testing | [TESTING.md](./TESTING.md) |
| Workflow | [WORKFLOW.md](./WORKFLOW.md) |

## Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | :3015 with `--env-file=.env` |
| `npm run ci` | lint + spec:lint + spec:consistency + test |
| `npm test` | unit + integration (`--env-file=.env.test`) |

## API Endpoints (summary)

Prefix via gateway: `/api/v1/branch-report`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/invite-links` | Affiliate links for `x-user-ou` + `x-user-branch` |
| GET | `/royalty-21-times` | Paginated member metrics; query `channelType`, `regDateFrom`, `regDateTo`, optional `inviteLinkId` |
| GET | `/healthz`, `/readyz` | Probes (no mesh auth) |

## Trust & scope (**OBSERVED**)

- Mesh auth only — `GATEWAY_SECRET` + `x-user-ou` / `x-user-branch` (required)
- **No** backend permission keys — authorization ที่ gateway/UI
- Read-only queries บน production branch DB — ไม่ mutate

## Acceptance criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC-1 | Gateway secret required | `resolve-gateway-secret.test.js`, `app` tests |
| AC-2 | Invite links list scoped to tenant | invite-links tests |
| AC-3 | Royalty report channel filters + pagination | royalty-21-times / channel-filter tests |
| AC-4 | OpenAPI lint passes | `spec:lint` |

## Spec-driven workflow

[WORKFLOW.md](./WORKFLOW.md)
