import { ObjectId } from 'mongodb';



import { getInvoiceDatabase } from '../../config/database-invoice.js';

import { isMongoUnauthorized } from '../../lib/mongo-errors.js';



const COLLECTION = 'agent_iv';



const DETAIL_PROJECTION = {

  _id: 1,

  ou_id: 1,

  branch_id: 1,

  iv_no: 1,

  billing_month: 1,

  due_date: 1,

  net_win: 1,

  amount: 1,

  status: 1,

  cr_by: 1,

  cr_prog: 1,

  cr_date: 1,

  upd_by: 1,

  upd_prog: 1,

  upd_date: 1,

};



const LIST_PROJECTION = {

  _id: 1,

  ou_id: 1,

  branch_id: 1,

  iv_no: 1,

  billing_month: 1,

  due_date: 1,

  net_win: 1,

  amount: 1,

  status: 1,

  cr_by: 1,

  cr_prog: 1,

  cr_date: 1,

  upd_by: 1,

  upd_prog: 1,

  upd_date: 1,

};



/**

 * @param {{ ouId?: string, ivNo?: string, branchId?: string, billingMonth?: string, status?: string }} filters

 */

export function buildListFilter({ ouId, ivNo, branchId, billingMonth, status }) {

  /** @type {import('mongodb').Filter<import('mongodb').Document>} */

  const filter = {};

  if (ouId) {

    filter.ou_id = new ObjectId(ouId);

  }

  if (ivNo) {

    filter.iv_no = ivNo;

  }

  if (branchId) {

    filter.branch_id = new ObjectId(branchId);

  }

  if (billingMonth) {

    filter.billing_month = billingMonth;

  }

  if (status) {

    filter.status = status;

  }

  return filter;

}



/**

 * Total matching documents for list pagination.

 * @returns {Promise<number | null>} `null` when the DB user cannot run count (e.g. missing aggregate/count privilege).

 */

export async function countByFilter(filter) {

  const db = getInvoiceDatabase();

  const coll = db.collection(COLLECTION);



  try {

    return await coll.countDocuments(filter);

  } catch (err) {

    if (!isMongoUnauthorized(err)) throw err;

  }



  try {

    const result = await db.command({

      count: COLLECTION,

      query: filter,

    });

    return typeof result.n === 'number' ? result.n : 0;

  } catch (err) {

    if (!isMongoUnauthorized(err)) throw err;

    return null;

  }

}



export async function findManyByFilter({ filter, skip, limit }) {

  const db = getInvoiceDatabase();

  return db

    .collection(COLLECTION)

    .find(filter, { projection: LIST_PROJECTION })

    .sort({ cr_date: -1, _id: -1 })

    .skip(skip)

    .limit(limit)

    .toArray();

}



export async function findById(ivId, ouId) {

  const db = getInvoiceDatabase();

  /** @type {import('mongodb').Filter<import('mongodb').Document>} */

  const filter = { _id: new ObjectId(ivId) };

  if (ouId) {

    filter.ou_id = new ObjectId(ouId);

  }

  return db.collection(COLLECTION).findOne(filter, {

    projection: { _id: 1, ou_id: 1, branch_id: 1, status: 1, upd_date: 1 },

  });

}



export async function findDetailById(ivId, ouId) {

  const db = getInvoiceDatabase();

  /** @type {import('mongodb').Filter<import('mongodb').Document>} */

  const filter = { _id: new ObjectId(ivId) };

  if (ouId) {

    filter.ou_id = new ObjectId(ouId);

  }

  return db.collection(COLLECTION).findOne(filter, { projection: DETAIL_PROJECTION });

}



export async function findLatestByBranchId(branchId) {

  const db = getInvoiceDatabase();

  return db

    .collection(COLLECTION)

    .find({ branch_id: new ObjectId(branchId) })

    .sort({ _id: -1 })

    .limit(1)

    .next();

}



export async function insertOne(doc) {

  const db = getInvoiceDatabase();

  const result = await db.collection(COLLECTION).insertOne(doc);

  return { insertedId: result.insertedId };

}



export async function deleteOne({ id }) {

  const db = getInvoiceDatabase();

  return db.collection(COLLECTION).deleteOne({

    _id: new ObjectId(id),

  });

}



export async function updateStatus({

  id,

  ouId,

  status,

  actor,

  prog,

  extra = {},

  updDate = new Date(),

  expectedUpdDate,

  expectedStatus,

}) {

  const db = getInvoiceDatabase();

  const filter = { _id: new ObjectId(id) };

  if (ouId) {

    filter.ou_id = new ObjectId(ouId);

  }

  if (expectedStatus) {

    filter.status = expectedStatus;

  }

  if (expectedUpdDate) {

    filter.upd_date = expectedUpdDate;

  }

  const result = await db.collection(COLLECTION).updateOne(

    filter,

    {

      $set: {

        status,

        upd_by: actor,

        upd_prog: prog,

        upd_date: updDate,

        ...extra,

      },

    },

  );

  return { updDate, matchedCount: result.matchedCount };

}



/**

 * Optimistic lock: status must not be CAL and upd_date must match.

 * @returns {Promise<boolean>} true if lock acquired

 */

export async function tryLockForCalculate({

  id,

  expectedUpdDate,

  actor,

  prog,

  lockUpdDate = new Date(),

}) {

  const db = getInvoiceDatabase();

  const result = await db.collection(COLLECTION).updateOne(

    {

      _id: new ObjectId(id),

      status: { $ne: 'CAL' },

      upd_date: expectedUpdDate,

    },

    {

      $set: {

        status: 'CAL',

        upd_by: actor,

        upd_prog: prog,

        upd_date: lockUpdDate,

      },

    },

  );

  return result.matchedCount === 1;

}



export async function finalizeInvoice({

  id,

  status,

  netWin,

  amount,

  actor,

  prog,

  updDate = new Date(),

}) {

  return updateStatus({

    id,

    status,

    actor,

    prog,

    extra: { net_win: netWin, amount },

    updDate,

  });

}



export async function markError({ id, actor, prog }) {

  return updateStatus({ id, status: 'ERROR', actor, prog });

}



/**

 * Reset invoice stuck in CAL when lock is older than staleBefore.

 * @returns {Promise<boolean>} true when reset to PENDING

 */

export async function resetStaleCalLock({ id, actor, prog, staleBefore }) {

  const db = getInvoiceDatabase();

  const resetAt = new Date();

  const result = await db.collection(COLLECTION).updateOne(

    {

      _id: new ObjectId(id),

      status: 'CAL',

      upd_date: { $lt: staleBefore },

    },

    {

      $set: {

        status: 'PENDING',

        upd_by: actor,

        upd_prog: prog,

        upd_date: resetAt,

      },

    },

  );

  return result.modifiedCount === 1;

}

