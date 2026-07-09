---
status: implemented
created: 2026-07-03
updated: 2026-07-09
owner: Berlin
last-verified: 2026-07-09
source-scan: 2026-07-03 — src 58/58 files
---

# Spec: Smart Report Service

## Objective

**Smart Report** — ให้ staff วาง MongoDB query scripts, validate (acorn), test-run ใน sandbox, schedule (node-cron), export CSV/Excel

**OpenAPI:** [`openapi.yaml`](../../../../backend/service/smart-report/openapi.yaml) (direct mesh CRUD) · [`openapi-via-gateway.yaml`](../../../../backend/service/smart-report/openapi-via-gateway.yaml) (Bearer JWT via gateway)

## Consumers

- **backoffice** — report management UI
- **gateway** — `/api/v1/smart-reports/*` (timeouts 10s–130s)

## Source of Truth

| หัวข้อ | SoT |
|--------|-----|
| Business | [business-domain.md](./business-domain.md) |
| HTTP contract | [openapi.yaml](../../../../backend/service/smart-report/openapi.yaml) + [openapi-via-gateway.yaml](../../../../backend/service/smart-report/openapi-via-gateway.yaml) + [technical-architecture.md](./technical-architecture.md) |
| Persistence | [database-erd.md](./database-erd.md) |
| Error codes | [codes.yaml](../../../../backend/service/smart-report/codes.yaml) |
| Testing | [TESTING.md](./TESTING.md) |

## Commands

`npm run ci` — lint, format, spec:codes, **spec:lint**, spec:consistency, test, audit

## API Endpoints (summary)

Prefix: `/api/v1/smart-reports` (+ `/healthz`, `/readyz`)

| Method | Path | หมายเหตุ |
|--------|------|----------|
| POST | `/validate` | AST validate script |
| POST | `/test-run` | sandbox execute + token |
| GET | `/history` | download history list |
| GET | `/download/:fileId` | file download |
| GET | `/` | list report definitions |
| POST | `/` | create report |
| GET | `/:id` | get one |
| PUT | `/:id` | update (ETag) |
| DELETE | `/:id` | delete |
| POST | `/:id/run` | manual run |

## Workflow

[WORKFLOW.md](./WORKFLOW.md)
