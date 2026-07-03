---
status: implemented
created: 2026-07-03
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 75/75 files
---

# Spec: Agent Invoice Service

## Objective

จัดการ **agents (branches)**, **agent fee overrides**, และ **agent invoices** — generate, list, fee calculation, status lifecycle

**OBSERVED** modules: `agents`, `agent-fees`, `invoices`

## Consumers

- **backoffice** / **backoffice-shadcn** — invoice UI, agent management
- **gateway** — `/api/v1/agent-invoice/*`, `/api/v1/invoices/*`

## Source of Truth

| หัวข้อ | SoT |
|--------|-----|
| Business | [business-domain.md](./business-domain.md) |
| Technical | [technical-architecture.md](./technical-architecture.md) |
| Persistence | [database-erd.md](./database-erd.md) |
| HTTP | [openapi.yaml](../../../../backend/service/agent-invoice/openapi.yaml) |
| Testing | [TESTING.md](./TESTING.md) |
| Workflow | [WORKFLOW.md](./WORKFLOW.md) |

## Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | :3102 with watch |
| `npm run ci` | lint + format + spec:lint + unit + integration:ci + spec:consistency + audit |
| `npm run init:db` | indexes |

## API Endpoints (summary)

Prefix via gateway: `/api/v1/agent-invoice` and `/api/v1/invoices`

### Agents (`/api/v1/agent-invoice/agents`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `agents:list` |
| GET | `/:id` | `agents:list` |
| POST | `/` | `agents:write` |
| PUT | `/:id` | `agents:write` |
| DELETE | `/:id` | `agents:write` |
| POST | `/sync` | `agents:write` |
| GET | `/unsynced` | `agents:list` |

### Agent fees & master data

| Method | Path | Permission |
|--------|------|------------|
| GET/POST/PUT/DELETE | `/api/v1/agent-invoice/agents/:agentId/fees...` | `agent-fees:*` |
| GET | `/api/v1/agent-invoice/master-data/game-companies` | `agents:list` |
| GET | `/api/v1/agent-invoice/master-data/categories` | `agents:list` |

### Invoices (`/api/v1/invoices`)

| Method | Path | Permission |
|--------|------|------------|
| POST | `/generate` | `invoices:write` |
| POST | `/calculate-fee` | `invoices:write` |
| GET | `/` | `invoices:list` |
| GET | `/agent` | `invoices:list` |
| GET | `/:id` | `invoices:read` |
| GET | `/:id/transactions` | `invoices:read` |
| PUT | `/:id/status` | `invoices:write` |

## Branch scope (**OBSERVED**)

| Rule | Behavior |
|------|----------|
| List default | `GET /invoices` — ถ้าไม่ส่ง `branch_id` → inject `x-user-branch` เป็น filter (`agent-invoices.controller.js`) |
| Explicit `branch_id` | query override header |
| OU scope | ทุก query filter ด้วย `ouId` จาก `x-user-ou` |
| By-id reads | filter `ouId` — branch pin ตาม implementation ปัจจุบัน |

## Acceptance criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC-1 | Gateway secret required | `src/app.test.js` |
| AC-2 | Agent CRUD + sync | `agents.route.test.js` |
| AC-3 | Agent fees CRUD | `agent-fees.route.test.js` |
| AC-4 | Master data read | `master-data.test.js` |
| AC-5 | Invoice list pagination | invoices unit/integration tests |
| AC-7 | List defaults to active branch | controller inject branch_id |

## Spec-driven workflow

[WORKFLOW.md](./WORKFLOW.md)
