#!/usr/bin/env node
/**
 * สร้าง indexes สำหรับ collections `reports` และ `download_history` — ใช้ตั้งต้น environment ใหม่
 * (Index ชุดเดียวกับที่ app เรียกอัตโนมัติตอน bootstrap ผ่าน ensureReportIndexes/ensureDownloadHistoryIndexes
 * ดู docs/db/erd.md §Database Indexes)
 *
 * ใช้งาน:
 *   npm run init:db
 *   node --env-file-if-exists=.env scripts/init-db.mjs
 */
import { MongoClient } from "mongodb";
import {
  REPORTS_COLLECTION,
  ensureReportIndexes,
} from "../src/modules/reports/reports.repository.js";
import {
  DOWNLOAD_HISTORY_COLLECTION,
  ensureDownloadHistoryIndexes,
} from "../src/modules/reports/download-history.repository.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is required (ใช้กับ --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME || "smart-report";

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

console.log("=== init-db: indexes สำหรับ smart-report ===");
console.log(`Database: ${db.databaseName}`);
console.log("");

console.log("▶ สร้าง indexes...");
await ensureReportIndexes(db);
console.log("  ✔ reports: IDX_REPORTS_NAME_UNIQUE (unique)");
console.log("  ✔ reports: IDX_REPORTS_ENABLED");

await ensureDownloadHistoryIndexes(db);
console.log("  ✔ download_history: IDX_DOWNLOAD_HISTORY_REPORT_LIST");
console.log("  ✔ download_history: IDX_DOWNLOAD_HISTORY_RECENT");
console.log("");

const reportsCount = await db.collection(REPORTS_COLLECTION).countDocuments();
const historyCount = await db
  .collection(DOWNLOAD_HISTORY_COLLECTION)
  .countDocuments();

console.log("=== สรุป ===");
console.log(`  documents ใน reports: ${reportsCount}`);
console.log(`  documents ใน download_history: ${historyCount}`);

await client.close();
