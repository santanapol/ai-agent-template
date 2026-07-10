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

/**
 * Paginated list of download history records, most recent first.
 *
 * @param {import('mongodb').Db} db
 * @param {object} [options]
 * @param {number} [options.page] - 1-based page number
 * @param {number} [options.limit] - page size
 * @param {import('mongodb').ObjectId} [options.reportId]
 * @returns {Promise<{ items: DownloadHistory[], total: number }>}
 */
export async function findDownloadHistoryPage(
  db,
  { page = 1, limit = 20, reportId } = {},
) {
  const collection = db.collection(DOWNLOAD_HISTORY_COLLECTION);
  const skip = (page - 1) * limit;
  const filter = reportId ? { reportId } : {};

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { items, total };
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').ObjectId} id
 * @returns {Promise<DownloadHistory|null>}
 */
export async function findDownloadHistoryById(db, id) {
  return db.collection(DOWNLOAD_HISTORY_COLLECTION).findOne({ _id: id });
}
