#!/usr/bin/env node
/**
 * ใส่ตัวอย่าง report definitions ใน MongoDB (dev เท่านั้น)
 * ครอบคลุม schedule ทั้ง daily/weekly/monthly (รวมเคส dayOfMonth: 'last')/manual
 * และ outputFormat ทั้ง csv/excel — ดู docs/db/erd.md §Data Examples
 *
 * ใช้งาน:
 *   npm run seed:example
 *
 * ลบ reports ที่เคย seed ไว้ก่อนหน้า (cr_prog ตรงกับ script นี้) ก่อน seed ใหม่:
 *   npm run seed:example -- --reset
 */
import { MongoClient } from "mongodb";
import { REPORTS_COLLECTION } from "../src/modules/reports/reports.repository.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is required (ใช้กับ --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME || "zero-smart-report";
const resetReports = process.argv.includes("--reset");
const SEED_PROG = "scripts/seed-example-data.mjs";
const SEED_USER = process.env.SEED_USER_ID ?? "seed_script";

const reportsToSeed = [
  {
    name: "Daily New Members",
    description: "List of new members from yesterday",
    script:
      "db.getSiblingDB('crm').members.find({ cr_date: { $gte: ISODate(params.startDate), $lte: ISODate(params.endDate) } })",
    params: { timezoneOffsetMinutes: 420 },
    outputFormat: "csv",
    schedule: {
      frequency: "daily",
      hour: 7,
      minute: 0,
      timezone: "Asia/Bangkok",
    },
    enabled: true,
  },
  {
    name: "Weekly Agent Performance",
    description: "Weekly status summary of active agents",
    script:
      "db.getSiblingDB('gpp_777ww').agents.aggregate([{ $match: { active: true } }, { $project: { branch_code: 1, branch_name: 1, currency: 1 } }])",
    params: {},
    outputFormat: "excel",
    schedule: {
      frequency: "weekly",
      dayOfWeek: 1,
      hour: 8,
      minute: 0,
      timezone: "Asia/Bangkok",
    },
    enabled: true,
  },
  {
    name: "Monthly Revenue Summary",
    description: "Monthly revenue summary, runs on the last day of the month",
    script:
      "db.getSiblingDB('crm').orders.aggregate([{ $match: { cr_date: { $gte: ISODate(params.startDate), $lte: ISODate(params.endDate) } } }, { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }])",
    params: { timezoneOffsetMinutes: 420 },
    outputFormat: "excel",
    schedule: {
      frequency: "monthly",
      dayOfMonth: "last",
      hour: 23,
      minute: 30,
      timezone: "Asia/Bangkok",
    },
    enabled: false,
  },
  {
    name: "Ad-hoc Member Export",
    description: "Export all member data manually (no schedule)",
    script: "db.getSiblingDB('crm').members.find({})",
    params: {},
    outputFormat: "csv",
    schedule: null,
    enabled: true,
  },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection(REPORTS_COLLECTION);

console.log("=== seed-example-data: reports สำหรับ smart-report ===");
console.log(`Database: ${db.databaseName}`);
console.log("");

if (resetReports) {
  const removed = await col.deleteMany({ cr_prog: SEED_PROG });
  console.log(`ลบ reports ที่เคย seed ไว้: ${removed.deletedCount} รายการ`);
  console.log("");
}

const now = new Date();
let inserted = 0;
let updated = 0;

for (const report of reportsToSeed) {
  const existing = await col.findOne({ name: report.name });

  const doc = {
    ...report,
    cr_by: existing?.cr_by ?? SEED_USER,
    cr_date: existing?.cr_date ?? now,
    cr_prog: existing?.cr_prog ?? SEED_PROG,
    upd_by: SEED_USER,
    upd_date: now,
    upd_prog: SEED_PROG,
  };
  if (existing?._id) doc._id = existing._id;

  const result = await col.replaceOne({ name: report.name }, doc, {
    upsert: true,
  });
  if (result.upsertedCount > 0) inserted += 1;
  else if (result.modifiedCount > 0) updated += 1;
  console.log(`Report OK: ${report.name} (${report.outputFormat})`);
}

await client.close();

console.log("");
console.log("=== สรุป seed ===");
console.log(`  inserted: ${inserted}  updated: ${updated}`);
