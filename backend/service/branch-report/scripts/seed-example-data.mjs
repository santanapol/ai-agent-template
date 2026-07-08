#!/usr/bin/env node
/**
 * Minimal gpp_777ww documents for Royalty 21 / invite-link dev queries.
 *
 *   npm run seed:example
 *   npm run seed:example -- --reset
 */
import { MongoClient, ObjectId } from "mongodb";

const DEV_SEED_OU_ID = "5f4f9d57266ed249e45ecef5";
const DEV_SEED_BRANCH_ID = "5f4fb5bb3156af7a2db9e5a0";
const ZERO_HQ_BRANCH_ID = "6a3000010000000000000001";

/** @typedef {{ branchId: import('mongodb').ObjectId; inviteLinkId: import('mongodb').ObjectId; memberIds: import('mongodb').ObjectId[]; inviteCode: string }} BranchSeedTarget */

/** @type {BranchSeedTarget[]} */
const BRANCH_TARGETS = process.env.SEED_BRANCH_ID
  ? [
      {
        branchId: new ObjectId(process.env.SEED_BRANCH_ID),
        inviteLinkId: new ObjectId("6a2000100000000000000001"),
        memberIds: [
          new ObjectId("6a2000110000000000000001"),
          new ObjectId("6a2000120000000000000001"),
          new ObjectId("6a2000130000000000000001"),
        ],
        inviteCode: "DEV-LINK-01",
      },
    ]
  : [
      {
        branchId: new ObjectId(DEV_SEED_BRANCH_ID),
        inviteLinkId: new ObjectId("6a2000100000000000000001"),
        memberIds: [
          new ObjectId("6a2000110000000000000001"),
          new ObjectId("6a2000120000000000000001"),
          new ObjectId("6a2000130000000000000001"),
        ],
        inviteCode: "DEV-LINK-01",
      },
      {
        branchId: new ObjectId(ZERO_HQ_BRANCH_ID),
        inviteLinkId: new ObjectId("6a2000200000000000000001"),
        memberIds: [
          new ObjectId("6a2000210000000000000001"),
          new ObjectId("6a2000220000000000000001"),
          new ObjectId("6a2000230000000000000001"),
        ],
        inviteCode: "DEV-LINK-HQ",
      },
    ];

const uri = process.env.MONGODB_URI_READ ?? process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI_READ is required");
  process.exit(1);
}

const isLocalHarnessMongo =
  /^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(uri) ||
  uri.startsWith("mongodb://127.0.0.1") ||
  uri.startsWith("mongodb://localhost");

if (!isLocalHarnessMongo) {
  console.log(
    "Skip branch-report seed — MONGODB_URI_READ is remote/read-only (runtime may use Atlas). Local seed needs mongodb://127.0.0.1 or localhost; see backend/ENV.md § branch-report read DB.",
  );
  process.exit(0);
}

const dbName = process.env.MONGODB_DB_BRANCH || "gpp_777ww";
const reset = process.argv.includes("--reset");
const SEED_PROG = "scripts/seed-example-data.mjs";
const SEED_USER = "seed_script";

const ouId = process.env.SEED_OU_ID
  ? new ObjectId(process.env.SEED_OU_ID)
  : new ObjectId(DEV_SEED_OU_ID);

const regDate = new Date();
regDate.setUTCDate(regDate.getUTCDate() - 7);
regDate.setUTCHours(10, 30, 0, 0);

const regFrom = regDate.toISOString().slice(0, 10);
const regToDate = new Date(regDate);
regToDate.setUTCDate(regToDate.getUTCDate() + 14);
const regTo = regToDate.toISOString().slice(0, 10);

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const now = new Date();

if (reset) {
  await db.collection("member").deleteMany({ cr_prog: SEED_PROG });
  await db
    .collection("su_staff_invite_link")
    .deleteMany({ cr_prog: SEED_PROG });
  await db.collection("dm_dm_tn_deposit").deleteMany({ cr_prog: SEED_PROG });
  await db.collection("wallet_withdraw").deleteMany({ cr_prog: SEED_PROG });
  console.log("Cleared seed documents (cr_prog match)");
}

const memberRows = [
  {
    username: "7W0635268288",
    referral: "Member",
    referral_staff_link_id: null,
  },
  {
    username: "7W0635268289",
    referral: "Staff",
    referral_staff_link_id: "affiliate",
  },
  {
    username: "7W0635268290",
    referral: "Branch",
    referral_staff_link_id: null,
  },
];

for (const target of BRANCH_TARGETS) {
  const tenant = { ou_id: ouId, branch_id: target.branchId };

  const inviteDoc = {
    _id: target.inviteLinkId,
    ...tenant,
    invite_code: target.inviteCode,
    username: "BERLIN",
    description: "Harness dev affiliate link",
    staff_id: new ObjectId("6a190d6db5711c10d35d85ea"),
    active: true,
    cr_by: SEED_USER,
    cr_date: now,
    cr_prog: SEED_PROG,
    upd_by: SEED_USER,
    upd_date: now,
    upd_prog: SEED_PROG,
  };

  await db
    .collection("su_staff_invite_link")
    .replaceOne({ _id: target.inviteLinkId }, inviteDoc, { upsert: true });
  console.log(
    "Invite link OK:",
    inviteDoc.invite_code,
    `(branch ${target.branchId.toHexString()})`,
  );

  const members = memberRows.map((row, index) => ({
    _id: target.memberIds[index],
    username: row.username,
    referral: row.referral,
    referral_staff_link_id:
      row.referral_staff_link_id === "affiliate" ? target.inviteLinkId : null,
  }));

  for (const row of members) {
    const doc = {
      _id: row._id,
      ...tenant,
      username: row.username,
      referral: row.referral,
      referral_staff_link_id: row.referral_staff_link_id,
      reg_date: regDate,
      status: "active",
      cr_by: SEED_USER,
      cr_date: now,
      cr_prog: SEED_PROG,
      upd_by: SEED_USER,
      upd_date: now,
      upd_prog: SEED_PROG,
    };
    await db
      .collection("member")
      .replaceOne({ _id: row._id }, doc, { upsert: true });
    console.log(
      "Member OK:",
      row.username,
      `(${row.referral})`,
      `(branch ${target.branchId.toHexString()})`,
    );
  }

  for (const mem of members) {
    const depositDoc = {
      ...tenant,
      mem_id: mem._id,
      username: mem.username,
      status: "001",
      bill_date: regDate,
      amount: 1500,
      cr_by: SEED_USER,
      cr_date: now,
      cr_prog: SEED_PROG,
      upd_by: SEED_USER,
      upd_date: now,
      upd_prog: SEED_PROG,
    };
    await db
      .collection("dm_dm_tn_deposit")
      .replaceOne({ mem_id: mem._id, cr_prog: SEED_PROG }, depositDoc, {
        upsert: true,
      });

    const withdrawDoc = {
      ...tenant,
      uid: mem._id,
      username: mem.username,
      wd_status: "200",
      approve_date: regDate,
      amount: 500,
      cr_by: SEED_USER,
      cr_date: now,
      cr_prog: SEED_PROG,
      upd_by: SEED_USER,
      upd_date: now,
      upd_prog: SEED_PROG,
    };
    await db
      .collection("wallet_withdraw")
      .replaceOne({ uid: mem._id, cr_prog: SEED_PROG }, withdrawDoc, {
        upsert: true,
      });
  }

  console.log(
    "Deposits + withdraws OK (3 members)",
    `(branch ${target.branchId.toHexString()})`,
  );
}

await client.close();

console.log("");
console.log("=== สรุป seed branch-report ===");
console.log(`  database: ${dbName}`);
console.log(`  ou_id:     ${ouId.toHexString()}`);
for (const target of BRANCH_TARGETS) {
  console.log(`  branch_id: ${target.branchId.toHexString()}`);
  console.log(`  inviteLinkId: ${target.inviteLinkId.toHexString()}`);
}
console.log(`  suggested regDateFrom: ${regFrom}`);
console.log(`  suggested regDateTo:   ${regTo}`);
