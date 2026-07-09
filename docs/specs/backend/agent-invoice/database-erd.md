# agent-invoice — Database ERD

Consolidated from package `docs/database/erd.md` — synced with prod baseline [`docs/audit/prod-schema-baseline-2026-07-09.json`](../../../audit/prod-schema-baseline-2026-07-09.json) and `scripts/init-db.mjs`.

## Collections

### `agents`

Branch/agent profile — **unique `(ou_id, branch_id)`** per `init-db.mjs` (`agents_uniq_ou_branch`). Prod matches init-db (post-handoff 2026-07-09). Legacy `ou_id_1` / `parent_branch_id_1` indexes removed per [ADR 002](../../../adrs/002-drop-legacy-agents-indexes-on-prod.md).

Fields: `branch_id`, `branch_type` (`MA`|`AG`), `default_fee_rate`, `ref_fee_branch_id`, `parent_branch_id`, `active`, audit.

### `agent_fees`

Override fee per `branch_id` + `game_company_id` + `game_main_cate_id` — unique compound index `ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1`.

### `agent_iv`

Invoice header — `iv_no` (unique), `billing_month`, `branch_id`, `agent_id`, `status`, amounts, audit. List index: `(ou_id, branch_id, billing_month)`.

### `agent_iv_transaction`

Line items linked to `agent_iv` — unique `(ref_iv_id, company_id, main_category_id)`; list `(ref_iv_id, fee)`.

## Indexes (normative — init-db)

| Collection | Index | Keys |
|------------|-------|------|
| `agents` | `agents_uniq_ou_branch` | `{ ou_id: 1, branch_id: 1 }` unique |
| `agent_fees` | `ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1` | compound unique |
| `agent_iv` | `invoice_uniq_iv_no` | `{ iv_no: 1 }` unique |
| `agent_iv` | `invoice_by_ou_branch_month` | `{ ou_id: 1, branch_id: 1, billing_month: 1 }` |
| `agent_iv_transaction` | `txn_uniq_invoice_company_cate` | `{ ref_iv_id: 1, company_id: 1, main_category_id: 1 }` unique |
| `agent_iv_transaction` | `txn_by_invoice` | `{ ref_iv_id: 1, fee: 1 }` |

## Shared DB

MongoDB database `zero-agent-invoice` (prod/staging) / `zero-agent-invoice_0` (harness) — tenant isolation via `ou_id` on every query.

## Schema validation (`$jsonSchema`)

`validationLevel: "moderate"` on all four collections — SoT: [`collection-validators.mjs`](../../../../backend/service/agent-invoice/scripts/collection-validators.mjs). Applied by [`init-db.mjs`](../../../../backend/service/agent-invoice/scripts/init-db.mjs). Policy: [ADR 005](../../../adrs/005-mongodb-collection-validators-policy.md).

| Collection | Required (summary) |
|------------|-------------------|
| `agents` | `ou_id`, `branch_id` |
| `agent_fees` | `ou_id`, `branch_id`, `game_company_id`, `game_main_cate_id`, `agent_fee`, audit; `gcomp_cost` / `agent_known_fee` optional (API enforces on create) |
| `agent_iv` | `iv_no`, `ou_id`, `branch_id`, `billing_month` |
| `agent_iv_transaction` | `ref_iv_id`, `company_id`, `main_category_id` |

Prod rollout: [`collection-validators-handoff`](../../../ops/collection-validators-handoff-2026-07-09.md).
