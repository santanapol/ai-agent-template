import { ObjectId } from "mongodb";

import { getInvoiceDatabase } from "../../config/database-invoice.js";

const COLLECTION = "agent_iv_transaction";

export async function findByInvoiceId({ refIvId, missingFeeOnly = false }) {
  const db = getInvoiceDatabase();

  const filter = {
    ref_iv_id: new ObjectId(refIvId),
  };

  if (missingFeeOnly) {
    filter.fee = "N/A";
  }

  return db.collection(COLLECTION).find(filter).toArray();
}

export async function insertMany(docs) {
  const db = getInvoiceDatabase();

  if (docs.length === 0) return { insertedCount: 0 };

  const result = await db.collection(COLLECTION).insertMany(docs);

  return { insertedCount: result.insertedCount };
}

export async function updateFeeAndAmount({ id, fee, amount, actor, prog }) {
  const db = getInvoiceDatabase();

  return db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },

    {
      $set: {
        fee,

        amount,

        upd_by: actor,

        upd_prog: prog,

        upd_date: new Date(),
      },
    },
  );
}

export async function sumByInvoiceId(refIvId) {
  const db = getInvoiceDatabase();

  const rows = await db

    .collection(COLLECTION)

    .aggregate([
      {
        $match: {
          ref_iv_id: new ObjectId(refIvId),
        },
      },

      {
        $group: {
          _id: "$ref_iv_id",

          net_win: { $sum: "$net_win" },

          bet: { $sum: "$bet" },

          amount: { $sum: "$amount" },
        },
      },
    ])

    .toArray();

  if (rows.length === 0) {
    return { net_win: 0, bet: 0, amount: 0 };
  }

  return { net_win: rows[0].net_win, bet: rows[0].bet, amount: rows[0].amount };
}
