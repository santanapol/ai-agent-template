# agent-invoice — Database ERD

Consolidated from package `docs/database/erd.md` — verified **OBSERVED** against `scripts/init-db.mjs` and repositories.

## Collections

### `agents`

Branch/agent profile — unique `branch_code` per `ou_id`. Fields: `branch_id`, `branch_type` (`MA`|`AG`), `default_fee_rate`, `ref_fee_branch_id`, `parent_branch_id`, `active`, audit.

### `branch_category_fees`

Override fee per `agent_id` + `game_company_id` + `category_id` — unique compound index.

### `agent_iv`

Invoice header — `iv_no`, `billing_month`, `branch_id`, `agent_id`, `status`, amounts, audit.

### `agent_iv_transaction`

Line items linked to `agent_iv` — fee breakdown per category/company.

### Master reference

`game_companies`, `categories` — read-only master data endpoints.

## Indexes

See `scripts/init-db.mjs` — unique `agents (ou_id, branch_code)`, invoice list filters on `ou_id`, `branch_id`, `billing_month`, `status`.

## Shared DB

MongoDB database per env — tenant isolation via `ou_id` on every query.
