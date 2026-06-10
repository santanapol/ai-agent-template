export const DOWNLOAD_HISTORY_COLLECTION = "download_history";

/**
 * @typedef {object} DownloadHistory
 * @property {import('mongodb').ObjectId} [_id]
 * @property {import('mongodb').ObjectId} reportId
 * @property {string} reportName - ชื่อรายงาน ณ เวลาที่รัน (denormalized)
 * @property {string} fileName
 * @property {string} filePath
 * @property {"csv"|"excel"} format
 * @property {"running"|"success"|"failed"} status
 * @property {number|null} recordCount
 * @property {string|null} error
 * @property {"manual"|"scheduler"} triggeredBy
 * @property {Date} startedAt
 * @property {Date|null} finishedAt
 * @property {string} cr_by
 * @property {Date} cr_date
 * @property {string} cr_prog
 */

/** @param {import('mongodb').Db} db */
export async function ensureDownloadHistoryIndexes(db) {
  const collection = db.collection(DOWNLOAD_HISTORY_COLLECTION);
  await collection.createIndex(
    { reportId: 1, startedAt: -1 },
    { name: "IDX_DOWNLOAD_HISTORY_REPORT_LIST" },
  );
  await collection.createIndex(
    { startedAt: -1 },
    { name: "IDX_DOWNLOAD_HISTORY_RECENT" },
  );
  return collection;
}

/**
 * @param {import('mongodb').Db} db
 * @param {DownloadHistory} record
 * @returns {Promise<DownloadHistory>}
 */
export async function insertDownloadHistory(db, record) {
  const result = await db
    .collection(DOWNLOAD_HISTORY_COLLECTION)
    .insertOne(record);
  return { ...record, _id: result.insertedId };
}

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<DownloadHistory[]>}
 */
export async function findDownloadHistory(db) {
  return db
    .collection(DOWNLOAD_HISTORY_COLLECTION)
    .find({})
    .sort({ startedAt: -1 })
    .toArray();
}
