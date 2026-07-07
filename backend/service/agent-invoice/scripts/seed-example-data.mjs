#!/usr/bin/env node
/**
 * Example agents, fees, and invoice for harness / local dev.
 *
 *   npm run seed:example
 *   npm run seed:example -- --reset
 *
 * IDs align with auth `seed:example` (ou_id + customer branch 777WW).
 */
import { MongoClient, ObjectId } from "mongodb";

const DEV_SEED_OU_ID = "5f4f9d57266ed249e45ecef5";
const DEV_SEED_BRANCH_ID = "5f4fb5bb3156af7a2db9e5a0";

const SEED_AGENT_ID = new ObjectId("6a2000010000000000000001");
const SEED_GAME_COMPANY_ID = new ObjectId("6a2000020000000000000001");
const SEED_GAME_CATE_ID = new ObjectId("6a2000030000000000000001");
const SEED_INVOICE_ID = new ObjectId("6a2000040000000000000001");
const SEED_TXN_ID = new ObjectId("6a2000050000000000000001");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB_INVOICE || process.env.DB_NAME;
if (!dbName) {
  console.error("MONGODB_DB_INVOICE or DB_NAME is required");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const SEED_PROG = "scripts/seed-example-data.mjs";
const SEED_USER = "seed_script";

const ouId = process.env.SEED_OU_ID
  ? new ObjectId(process.env.SEED_OU_ID)
  : new ObjectId(DEV_SEED_OU_ID);
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId(DEV_SEED_BRANCH_ID);

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const now = new Date();

if (reset) {
  await db
    .collection("agent_iv_transaction")
    .deleteMany({ cr_prog: SEED_PROG });
  await db.collection("agent_iv").deleteMany({ cr_prog: SEED_PROG });
  await db.collection("agent_fees").deleteMany({ cr_prog: SEED_PROG });
  await db.collection("agents").deleteMany({ cr_prog: SEED_PROG });
  console.log("Cleared seed documents (cr_prog match)");
}

const agentDoc = {
  _id: SEED_AGENT_ID,
  ou_id: ouId,
  branch_id: branchId,
  branch_code: "777WW",
  branch_name: "777WW Demo Branch",
  branch_desc: "Harness example agent",
  branch_type: "AG",
  parent_branch_id: null,
  ref_fee_branch_id: null,
  currency: "thb",
  default_fee_rate: 10,
  active: true,
  cr_by: SEED_USER,
  cr_date: now,
  cr_prog: SEED_PROG,
  upd_by: SEED_USER,
  upd_date: now,
  upd_prog: SEED_PROG,
};

await db
  .collection("agents")
  .replaceOne({ _id: SEED_AGENT_ID }, agentDoc, { upsert: true });
console.log("Agent OK:", agentDoc.branch_code);

const feeDoc = {
  ou_id: ouId,
  branch_id: branchId,
  game_company_id: SEED_GAME_COMPANY_ID,
  game_main_cate_id: SEED_GAME_CATE_ID,
  gcomp_cost: 8,
  agent_known_fee: 10,
  agent_fee: 10,
  cr_by: SEED_USER,
  cr_date: now,
  cr_prog: SEED_PROG,
  upd_by: SEED_USER,
  upd_date: now,
  upd_prog: SEED_PROG,
};

await db.collection("agent_fees").replaceOne(
  {
    ou_id: ouId,
    branch_id: branchId,
    game_company_id: SEED_GAME_COMPANY_ID,
    game_main_cate_id: SEED_GAME_CATE_ID,
  },
  feeDoc,
  { upsert: true },
);
console.log("Agent fee OK: game company + category");

const billingMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
const ivNo = `IV-${billingMonth.replace("-", "")}-001`;

const invoiceDoc = {
  _id: SEED_INVOICE_ID,
  ou_id: ouId,
  branch_id: branchId,
  branch_name: "777WW Demo Branch",
  iv_no: ivNo,
  billing_month: billingMonth,
  due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
  net_win: -125000,
  bet: 890000,
  amount: 12500,
  status: "READY",
  cr_by: SEED_USER,
  cr_date: now,
  cr_prog: SEED_PROG,
  upd_by: SEED_USER,
  upd_date: now,
  upd_prog: SEED_PROG,
};

await db
  .collection("agent_iv")
  .replaceOne({ _id: SEED_INVOICE_ID }, invoiceDoc, { upsert: true });
console.log("Invoice OK:", ivNo, invoiceDoc.status);

const txnDoc = {
  _id: SEED_TXN_ID,
  ref_iv_id: SEED_INVOICE_ID,
  ou_id: ouId,
  branch_id: branchId,
  company_id: SEED_GAME_COMPANY_ID,
  main_category_id: SEED_GAME_CATE_ID,
  net_win: -125000,
  bet: 890000,
  fee: 10,
  amount: 12500,
  cr_by: SEED_USER,
  cr_date: now,
  cr_prog: SEED_PROG,
  upd_by: SEED_USER,
  upd_date: now,
  upd_prog: SEED_PROG,
};

await db.collection("agent_iv_transaction").replaceOne(
  {
    ref_iv_id: SEED_INVOICE_ID,
    company_id: SEED_GAME_COMPANY_ID,
    main_category_id: SEED_GAME_CATE_ID,
  },
  txnDoc,
  { upsert: true },
);
console.log("Invoice transaction OK");

await client.close();

console.log("");
console.log("=== สรุป seed agent-invoice ===");
console.log(`  database: ${dbName}`);
console.log(`  ou_id:     ${ouId.toHexString()}`);
console.log(`  branch_id: ${branchId.toHexString()}`);
console.log(`  agent_id:  ${SEED_AGENT_ID.toHexString()}`);
console.log(`  invoice:   ${ivNo} (${invoiceDoc.status})`);
