#!/usr/bin/env node
/**
 * ใส่ข้อมูลโปรไฟล์พนักงานตัวอย่าง 3 คน สำหรับ staff-service (dev เท่านั้น)
 *
 *   npm run seed:example
 *
 * ให้ตรงกับ OU/Branch จาก auth seed
 */

import { MongoClient, ObjectId } from "mongodb";

// Default IDs ซิงค์กับ auth `npm run seed:example` (dev only)
// branch_id ต้องชี้ไปยัง branch จริงใน gpp_777ww.su_branch (ou_id เดียวกัน) มิฉะนั้น
// `GET /api/v1/invoices/agent` จะ resolve ชื่อ branch ไม่ได้ — ใช้ "777WW" (ou_id 5f4f9d57266ed249e45ecef5)
const DEV_SEED_OU_ID = "5f4f9d57266ed249e45ecef5";
const DEV_SEED_BRANCH_ID = "5f4fb5bb3156af7a2db9e5a0";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is required (ใช้กับ --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME || "zero-platform";
const resetData = process.argv.includes("--reset");
const SEED_PROG = "scripts/seed-example-data.mjs";
const SEED_USER = "seed_script";

const ouId = process.env.SEED_OU_ID
  ? new ObjectId(process.env.SEED_OU_ID)
  : new ObjectId(DEV_SEED_OU_ID);
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId(DEV_SEED_BRANCH_ID);

const profilesToSeed = [
  {
    profileId: new ObjectId("507f1f77bcf86cd799439011"),
    userId: new ObjectId("6a153e4c84136d940330991e"),
    code: "EMP-001",
    firstname: "Somchai",
    lastname: "Platform Admin",
    email: "platform_admin@example.com",
    role: "platform_admin",
  },
  {
    profileId: new ObjectId("507f1f77bcf86cd799439012"),
    userId: new ObjectId("6a190d6db5711c10d35d85e8"),
    code: "EMP-002",
    firstname: "Somsri",
    lastname: "Branch",
    email: "branch_admin@example.com",
    role: "branch_admin",
  },
  {
    profileId: new ObjectId("507f1f77bcf86cd799439013"),
    userId: new ObjectId("6a190d6db5711c10d35d85ea"),
    code: "EMP-003",
    firstname: "Sompong",
    lastname: "Staff",
    email: "staff@example.com",
    role: "staff",
  },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection("staff_profiles");

if (resetData) {
  const removed = await col.deleteMany({ ou_id: ouId });
  console.log(
    `Cleared profiles for tenant: ${removed.deletedCount} document(s)`,
  );
}

const now = new Date();

for (const profile of profilesToSeed) {
  const existing = await col.findOne({ user_id: profile.userId });

  const profileDoc = {
    _id: existing?._id ?? profile.profileId,
    user_id: profile.userId,
    ou_id: ouId,
    branch_id: branchId,
    code: profile.code,
    firstname: profile.firstname,
    lastname: profile.lastname,
    email: profile.email,
    tel: existing?.tel ?? "+66812345678",
    status: existing?.status ?? "active",
    cr_by: existing?.cr_by ?? SEED_USER,
    cr_date: existing?.cr_date ?? now,
    cr_prog: existing?.cr_prog ?? SEED_PROG,
    upd_by: SEED_USER,
    upd_date: now,
    upd_prog: SEED_PROG,
  };

  await col.replaceOne({ user_id: profile.userId }, profileDoc, {
    upsert: true,
  });

  console.log(`Profile OK: ${profile.code} (${profile.email})`);
}

await client.close();

console.log("");
console.log("=== สรุป seed ===");
for (const profile of profilesToSeed) {
  console.log(`[${profile.role}]`);
  console.log(`  profile_id: ${profile.profileId.toHexString()}`);
  console.log(`  user_id:    ${profile.userId.toHexString()}`);
  console.log(`  x-user-ou:     ${ouId.toHexString()}`);
  console.log(`  x-user-branch: ${branchId.toHexString()}`);
  console.log("");
}
