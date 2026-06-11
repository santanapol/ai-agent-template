export const REPORTS_COLLECTION = "reports";

/**
 * @typedef {object} Report
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} name - ชื่อรายงาน (unique)
 * @property {string} [description]
 * @property {string} script - MongoDB JS query script (mongo shell style)
 * @property {Record<string, unknown>} [params] - ค่าเริ่มต้นของ dynamic parameters เช่น startDate, endDate, ou_id, branch_id
 * @property {"csv"|"excel"} outputFormat
 * @property {object|null} schedule - cron schedule config จาก UI dropdown, null = manual only
 * @property {boolean} enabled
 * @property {string} cr_by
 * @property {Date} cr_date
 * @property {string} cr_prog
 * @property {string} upd_by
 * @property {Date} upd_date
 * @property {string} upd_prog
 */

/** @param {import('mongodb').Db} db */
export async function ensureReportIndexes(db) {
  const collection = db.collection(REPORTS_COLLECTION);
  await collection.createIndex(
    { name: 1 },
    { unique: true, name: "IDX_REPORTS_NAME_UNIQUE" },
  );
  await collection.createIndex({ enabled: 1 }, { name: "IDX_REPORTS_ENABLED" });
  return collection;
}

/**
 * @param {import('mongodb').Db} db
 * @param {Report} report
 * @returns {Promise<Report>}
 */
export async function insertReport(db, report) {
  const result = await db.collection(REPORTS_COLLECTION).insertOne(report);
  return { ...report, _id: result.insertedId };
}

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<Report[]>}
 */
export async function findReports(db) {
  return db.collection(REPORTS_COLLECTION).find({}).toArray();
}

/**
 * Paginated list of report definitions, ordered by name.
 *
 * @param {import('mongodb').Db} db
 * @param {object} [options]
 * @param {number} [options.page] - 1-based page number
 * @param {number} [options.limit] - page size
 * @returns {Promise<{ items: Report[], total: number }>}
 */
export async function findReportsPage(db, { page = 1, limit = 20 } = {}) {
  const collection = db.collection(REPORTS_COLLECTION);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    collection.find({}).sort({ name: 1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments({}),
  ]);

  return { items, total };
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} id
 * @returns {Promise<Report|null>}
 */
export async function findReportById(db, id) {
  return db.collection(REPORTS_COLLECTION).findOne({ _id: id });
}

/**
 * Optimistic-lock update: only applies when `upd_date` still matches `expectedUpdDate`.
 *
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} id
 * @param {Partial<Report>} updates
 * @param {Date} expectedUpdDate
 * @returns {Promise<import('mongodb').UpdateResult>}
 */
export async function updateReport(db, id, updates, expectedUpdDate) {
  return db
    .collection(REPORTS_COLLECTION)
    .updateOne({ _id: id, upd_date: expectedUpdDate }, { $set: updates });
}

/**
 * Optimistic-lock delete: only applies when `upd_date` still matches `expectedUpdDate`.
 *
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} id
 * @param {Date} expectedUpdDate
 * @returns {Promise<import('mongodb').DeleteResult>}
 */
export async function deleteReport(db, id, expectedUpdDate) {
  return db
    .collection(REPORTS_COLLECTION)
    .deleteOne({ _id: id, upd_date: expectedUpdDate });
}
