# agent_fees — prod `cr_by` backfill (2026-07-09)

> **Status: complete** — backfill done 2026-07-09 (`cr_by: null` → 0); `agent_fees` validator prod **done**.  
> See [`collection-validators-handoff-2026-07-09.md`](./collection-validators-handoff-2026-07-09.md).

## Root cause

Legacy script `Insert Main Cate Data Script` (Nov 2025) inserted fees for new category `68deaa106de79a6bd4ec9962` with `cr_by: null` but `upd_by: "DENVER"` and full `cr_date` / `upd_*`.

## Affected rows (prod read-only audit)

| `_id` | Branch | Agent | `upd_by` | Notes |
|-------|--------|-------|----------|-------|
| `6909a99526b022a54db5b75c` | Inwa777 (`6201f866…`) | IN / Inwa777 | DENVER | 4 related `agent_iv_transaction` rows |
| `6909a99526b022a54db5b75d` | Inwa777 (`6201f866…`) | IN / Inwa777 | DENVER | — |
| `6909bb9b26b022a54db5b772` | `68956d2cc…` | **no `agents` row** | DENVER | orphan fee; 0 iv txn refs — backfill metadata only |

**Decision:** backfill `cr_by` from `upd_by` for all 3 (fee rates kept; orphan agent is a separate data-quality follow-up).

---

## 1. Pre-check (read-only)

```javascript
use zero-agent-invoice

db.agent_fees.countDocuments({ cr_by: null })
// expect: 3

db.agent_fees.find(
  { cr_by: null },
  { _id: 1, branch_id: 1, game_company_id: 1, game_main_cate_id: 1, upd_by: 1, cr_by: 1 }
)
```

---

## 2. Backfill (write)

```javascript
use zero-agent-invoice

const result = db.agent_fees.updateMany(
  { cr_by: null, upd_by: { $type: "string", $ne: "" } },
  [
    {
      $set: {
        cr_by: "$upd_by",
        upd_prog: "backfill_cr_by_2026-07-09"
      }
    }
  ]
)

printjson(result)
// expect: matchedCount: 3, modifiedCount: 3
```

---

## 3. Post-check (read-only)

```javascript
db.agent_fees.countDocuments({ cr_by: null })
// expect: 0

db.agent_fees.find(
  { upd_prog: "backfill_cr_by_2026-07-09" },
  { _id: 1, cr_by: 1, upd_by: 1, upd_prog: 1 }
)
// expect: 3 docs, cr_by: "DENVER"
```

---

## 4. Apply validator (after backfill)

On **staging** (done 2026-07-09):

```bash
node scripts/ops/apply-collection-validators.mjs \
  --env-file=backend/service/agent-invoice/.env.staging \
  --db=zero-agent-invoice --collection=agent_fees
```

On **prod** (Compass / mongosh):

```javascript
use zero-agent-invoice

db.runCommand({
  collMod: "agent_fees",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "ou_id", "branch_id", "game_company_id", "game_main_cate_id",
        "cr_by", "cr_date", "cr_prog", "upd_by", "upd_date", "upd_prog"
      ],
      properties: {
        ou_id: { bsonType: "objectId" },
        branch_id: { bsonType: "objectId" },
        game_company_id: { bsonType: "objectId" },
        game_main_cate_id: { bsonType: "objectId" },
        gcomp_cost: { bsonType: ["double", "int", "long"] },
        agent_known_fee: { bsonType: ["double", "int", "long"] },
        agent_fee: { bsonType: ["double", "int", "long"] },
        cr_by: { bsonType: "string", minLength: 1 },
        cr_date: { bsonType: "date" },
        cr_prog: { bsonType: "string", minLength: 1 },
        upd_by: { bsonType: "string", minLength: 1 },
        upd_date: { bsonType: "date" },
        upd_prog: { bsonType: "string", minLength: 1 }
      }
    }
  },
  validationLevel: "moderate"
})
```

Verify:

```javascript
db.getCollectionInfos({ name: "agent_fees" })[0].options.validationLevel
// "moderate"
```

---

## 5. Update handoff status

Mark `agent_fees` staging/prod **done** in [`collection-validators-handoff-2026-07-09.md`](./collection-validators-handoff-2026-07-09.md).

Optional: re-dump prod baseline per [`prod-schema-handoff-2026-07-09.md`](./prod-schema-handoff-2026-07-09.md).

---

## Follow-up (optional, not blocking validator)

- Orphan fee `6909bb9b…` — branch `68956d2cc…` has no `agents` row; confirm with ops whether to add agent or delete fee.
- Audit legacy insert script so future bulk imports set `cr_by`.
