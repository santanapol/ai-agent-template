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
