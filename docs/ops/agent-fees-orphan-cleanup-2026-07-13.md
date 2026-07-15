# agent_fees — orphan fee cleanup (TD-018)

> **Status:** closed — accepted legacy (2026-07-15)  
> **Decision:** retain prod orphan `agent_fees` (~1,887 rows, 30 branches); no bulk delete. Audit script kept for monitoring.
> **Related:** [agent-fees-cr-by-backfill-prod-2026-07-09.md](./agent-fees-cr-by-backfill-prod-2026-07-09.md)

## Context

Prod read-only audit found `agent_fees` rows with **no matching `agents` parent** (`ou_id` + `branch_id`). Re-audit 2026-07-15: **~1,887 rows** across **30 branches** (78% of `agent_fees`); prod `agents` has 15 branches; all orphan rows have `related_txns=0`. Original TD-018 target row (`6909bb9b…`) no longer present.

| `_id` | Branch | Notes |
|-------|--------|-------|
| `6909bb9b26b022a54db5b772` | `68956d2cc…` | orphan fee; 0 iv txn refs — metadata backfill only |

`agent_fees` has no FK to `agents._id`. Parent = `agents` row with same `ou_id` + `branch_id`.

## Accepted legacy (2026-07-15)

- **No delete** on prod or staging for bulk orphan cleanup.
- Orphan fees are unreachable via current app flow when no `agents` row exists for that branch; prod orphan rows have zero `agent_iv_transaction` refs.
- **Monitor only:** `node scripts/ops/audit-orphan-agent-fees.mjs --env-file=backend/service/agent-invoice/.env.prod` (exit 1 expected while legacy retained).

Sections 2–4 below are **historical** runbook for single-row cleanup — do not execute bulk delete without a new ops ticket.

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

- [x] Ops decision: retain legacy orphan fees (2026-07-15)
- [ ] ~~Staging pre-check passed~~ — N/A (no delete)
- [ ] ~~Staging delete + audit script exit 0~~ — N/A
- [ ] ~~Ops sign-off~~ — N/A
- [ ] ~~Prod delete + audit script exit 0~~ — N/A
- [x] TD-018 closed in tech-debt tracker (accepted legacy)
