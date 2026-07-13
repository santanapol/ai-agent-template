# agent_fees — orphan fee cleanup (TD-018)

> **Status:** pending human delete on prod  
> **Related:** [agent-fees-cr-by-backfill-prod-2026-07-09.md](./agent-fees-cr-by-backfill-prod-2026-07-09.md)

## Context

Prod read-only audit (2026-07-09) found one `agent_fees` row with **no matching `agents` parent** (`ou_id` + `branch_id`):

| `_id` | Branch | Notes |
|-------|--------|-------|
| `6909bb9b26b022a54db5b772` | `68956d2cc…` | orphan fee; 0 iv txn refs — metadata backfill only |

`agent_fees` has no FK to `agents._id`. Parent = `agents` row with same `ou_id` + `branch_id`.

**Decision (2026-07-13):** delete orphan fee row after staging dry-run.

## Env guard

Before any write:

```javascript
// Must be zero-agent-invoice — NOT harness _0 suffix for prod/staging deletes
db.getName()
// expect: "zero-agent-invoice"
```

Use URI from `backend/service/agent-invoice/.env.staging` or `.env.prod` only — never harness `.env.harness` for production deletes.

## Automated audit (read-only)

```bash
node scripts/ops/audit-orphan-agent-fees.mjs --env-file=backend/service/agent-invoice/.env.staging
node scripts/ops/audit-orphan-agent-fees.mjs --env-file=backend/service/agent-invoice/.env.prod
```

Exit 0 = no orphans. Exit 1 = orphans listed (review before delete).

---

## 1. Pre-check (read-only)

```javascript
use zero-agent-invoice

const orphanId = ObjectId("6909bb9b26b022a54db5b772")
const fee = db.agent_fees.findOne({ _id: orphanId })
// assert fee exists — if missing, orphan already cleaned

db.agents.countDocuments({
  ou_id: fee.ou_id,
  branch_id: fee.branch_id,
})
// expect: 0

db.agent_iv_transaction.countDocuments({
  branch_id: fee.branch_id,
  company_id: fee.game_company_id,
  main_category_id: fee.game_main_cate_id,
})
// expect: 0
```

---

## 2. Staging dry-run

1. Run audit script on staging — confirm orphan listed (or already absent).
2. **Archive** fee doc: `printjson(fee)` → save to ops ticket.
3. Delete on staging:

```javascript
db.agent_fees.deleteOne({ _id: orphanId })
```

4. Post-check: `db.agent_fees.findOne({ _id: orphanId })` → `null`
5. Re-run audit script — exit 0.

---

## 3. Prod delete (after ops sign-off)

Same steps as staging using prod URI / Compass.

```javascript
const fee = db.agent_fees.findOne({ _id: orphanId })
printjson(fee)  // archive first
db.agent_fees.deleteOne({ _id: orphanId })
```

Post-check + audit script exit 0.

**Close TD-018** in [`tech-debt-tracker.md`](../exec-plans/tech-debt-tracker.md) after prod confirm.

---

## 4. Rollback (if needed)

Re-insert archived document from ops ticket:

```javascript
db.agent_fees.insertOne({ /* archived fee doc */ })
```

---

## Checklist

- [ ] Staging pre-check passed
- [ ] Staging delete + audit script exit 0
- [ ] Ops sign-off
- [ ] Prod delete + audit script exit 0
- [ ] TD-018 closed in tech-debt tracker
