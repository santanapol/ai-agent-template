#!/usr/bin/env node
/**
 * ใส่ข้อมูล items ตัวอย่างใน MongoDB (dev เท่านั้น)
 *
 *   npm run seed:example
 *
 * ให้ตรงกับ user จาก auth seed (gateway E2E):
 *   - ค่า default ด้านล่างซิงค์มาจาก `npm run seed:example` ของ auth แล้ว
 *   - ถ้า auth seed ใหม่ ให้อัปเดต DEV_SEED_OU_ID / DEV_SEED_BRANCH_ID ด้วย
 *   - หรือ override ผ่าน env: SEED_OU_ID=<hex> SEED_BRANCH_ID=<hex> npm run seed:example
 *
 * ล้าง items ของ tenant ก่อน seed ใหม่:
 *   npm run seed:example -- --reset-items
 */

// Default IDs ซิงค์กับ auth `npm run seed:example` (dev only)
const DEV_SEED_OU_ID = "6a190d6c1fee03c383137249";
const DEV_SEED_BRANCH_ID = "6a190d6c1fee03c38313724a";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is required (ใช้กับ --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME || "demo-service";
const resetItems = process.argv.includes("--reset-items");
const SEED_PROG = "scripts/seed-example-data.mjs";
const SEED_USER = process.env.SEED_USER_ID ?? "seed_script";

const ouId = process.env.SEED_OU_ID
  ? new ObjectId(process.env.SEED_OU_ID)
  : new ObjectId(DEV_SEED_OU_ID);
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId(DEV_SEED_BRANCH_ID);

/** @type {{ code: string, name: string, description: string | null, status: string, tags: string[] }[]} */
const examples = [
  {
    code: "DEMO-001",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse for office use",
    status: "active",
    tags: ["hardware", "peripheral"],
  },
  {
    code: "DEMO-002",
    name: "USB-C Hub",
    description: "7-in-1 hub — draft listing",
    status: "draft",
    tags: ["hardware"],
  },
  {
    code: "DEMO-003",
    name: "Legacy Keyboard",
    description: null,
    status: "inactive",
    tags: [],
  },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("items");

const tenantFilter = { ou_id: ouId, branch_id: branchId };

if (resetItems) {
  const removed = await col.deleteMany(tenantFilter);
  console.log(`Cleared items for tenant: ${removed.deletedCount} document(s)`);
}

const now = new Date();
let inserted = 0;
let updated = 0;

for (const row of examples) {
  const existing = await col.findOne({ ...tenantFilter, code: row.code });
  const doc = {
    _id: existing?._id ?? new ObjectId(),
    ou_id: ouId,
    branch_id: branchId,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    tags: row.tags,
    cr_by: existing?.cr_by ?? SEED_USER,
    cr_date: existing?.cr_date ?? now,
    cr_prog: existing?.cr_prog ?? SEED_PROG,
    upd_by: SEED_USER,
    upd_date: now,
    upd_prog: SEED_PROG,
  };
  
  const result = await col.replaceOne(
    { ...tenantFilter, code: row.code },
    doc,
    { upsert: true }
  );
  if (result.upsertedCount > 0) inserted += 1;
  else if (result.modifiedCount > 0) updated += 1;
  console.log("Item OK:", row.code, row.status);
}

await client.close();

console.log("");
console.log("=== สรุป seed ===");
console.log(`  inserted: ${inserted}  updated: ${updated}`);
console.log(`  ou_id:     ${ouId.toHexString()}`);
console.log(`  branch_id: ${branchId.toHexString()}`);
console.log("");
console.log("--- mesh headers (direct smoke / Bruno) ---");
console.log(`  x-user-ou: ${ouId.toHexString()}`);
console.log(`  x-user-branch: ${branchId.toHexString()}`);
console.log(`  x-user-id: ${SEED_USER}`);
console.log("");
console.log(
  "Gateway E2E: ใช้ SEED_OU_ID/SEED_BRANCH_ID เดียวกับ auth seed แล้ว login ด้วย user ใน tenant นั้น",
);
console.log(
  "หรือรัน: SEED_OU_ID=<hex> SEED_BRANCH_ID=<hex> npm run seed:example",
);
