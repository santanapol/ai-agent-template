---
status: implemented
created: 2026-07-03
updated: 2026-07-03
owner: Berlin
last-verified: 2026-07-03
source-scan: 2026-07-03 — src 77/77 files
---

# Spec: Agent Invoice Service

## Objective

จัดการ **agents (branches)**, **agent fee overrides**, และ **agent invoices** — generate, list, fee calculation, status lifecycle

**OBSERVED** modules: `agents`, `agent-fees`, `invoices`

## Consumers

- **backoffice** / **backoffice** — invoice UI, agent management
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
| GET | `/api/v1/agent-invoice/master-data/game-categories` | `agents:list` |

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

## Branch scope (**OBSERVED** — post #46)

Roles ที่สลับสาขาได้ (`canSwitchActiveBranchRole`): `platform_admin`, `support_admin`, `support` — จาก `@zero-platform/roles`.

| Rule | Behavior |
|------|----------|
| OU scope | ทุก read/write filter ด้วย `ouId` จาก `x-user-ou` |
| List — pinned role | `resolveListInvoicesRequestQuery` **บังคับ** `branch_id` = `x-user-branch` (ไม่รับ override) |
| List — switchable role, no query | default `branch_id` = `x-user-branch` เมื่อมีค่า |
| List — switchable role, `branch_id=all` | sentinel `ALL_BRANCHES_QUERY` — ไม่ filter สาขา (OU-wide list) |
| List — switchable role, explicit ObjectId | ใช้ค่าที่ส่งมา |
| By-id reads | `resolveScopeBranchId` → pinned roles ส่ง `branch_id` ไป repo; switchable roles ไม่ pin (OU scope only) |
| Generate | pinned role ใช้ `x-user-branch`; switchable role ใช้ `body.branch_id` |
| Calculate-fee / detail / transactions / status | ใช้ `scopeBranchId` เดียวกับ by-id reads |

## Acceptance criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC-1 | Gateway secret required | `src/app.test.js` |
| AC-2 | Agent CRUD + sync | `agents.route.test.js` |
| AC-3 | Agent fees CRUD | `agent-fees.route.test.js` |
| AC-4 | Master data read | `master-data.test.js` |
| AC-5 | Invoice list pagination | invoices unit/integration tests |
| AC-6 | List branch scope (pinned vs switchable, `all` sentinel) | `invoices.list-branch-scope.test.js`, `list-invoices.query.test.js` |
| AC-7 | By-id branch scope on detail / transactions / calculate-fee / status | `invoices.by-id-branch-scope.test.js` |

## Spec-driven workflow

[WORKFLOW.md](./WORKFLOW.md)
