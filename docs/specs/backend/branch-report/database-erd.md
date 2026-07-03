# branch-report — Database ERD (read-only)

Service connects to **shared branch database** (`MONGODB_DB_BRANCH`) — **OBSERVED** collection names from repositories.

## Collections used

| Collection | Usage |
|------------|-------|
| `su_staff_invite_link` | Invite link dropdown — filter `ou_id`, `branch_id`; sort `invite_code` |
| `member` | Royalty report member list + registration filter |
| `dm_dm_tn_deposit` | Deposit aggregates per member |
| `wallet_withdraw` | Withdraw aggregates per member |

## Tenancy

All queries scoped by `ou_id` + `branch_id` ObjectIds from mesh headers.

## Indexes

**OBSERVED:** no package `init-db` — relies on existing branch DB indexes. Service is read-only.
