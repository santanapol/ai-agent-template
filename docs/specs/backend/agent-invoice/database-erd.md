# agent-invoice — Database ERD

Consolidated from package `docs/database/erd.md` — verified **OBSERVED** against `scripts/init-db.mjs` and repositories.

## Collections

### `agents`

Branch/agent profile — unique `branch_code` per `ou_id`. Fields: `branch_id`, `branch_type` (`MA`|`AG`), `default_fee_rate`, `ref_fee_branch_id`, `parent_branch_id`, `active`, audit.

### `agent_fees`

Override fee per `branch_id` + `game_company_id` + `game_main_cate_id` — unique compound index `ou_id_1_branch_id_1_game_company_id_1_game_main_cate_id_1`.

### `agent_iv`

Invoice header — `iv_no`, `billing_month`, `branch_id`, `agent_id`, `status`, amounts, audit.

### `agent_iv_transaction`

Line items linked to `agent_iv` — fee breakdown per category/company.

### Master reference

`game_companies`, `game_categories` — read-only master data endpoints (`/master-data/game-companies`, `/master-data/game-categories`).

## Indexes

See `scripts/init-db.mjs` — unique `agents (ou_id, branch_code)`, invoice list filters on `ou_id`, `branch_id`, `billing_month`, `status`.

## Shared DB

MongoDB database per env — tenant isolation via `ou_id` on every query.
