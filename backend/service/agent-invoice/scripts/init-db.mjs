#!/usr/bin/env node
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (use --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME;
if (!dbName) {
  console.error("DB_NAME is required");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db(dbName);

  console.log("=== init-db: agent-invoice-service ===");
  console.log(`Database: ${db.databaseName}`);
  console.log("");
  console.log("▶ สร้าง indexes...");

  const feesCol = db.collection("agent_fees");

  await feesCol.createIndex(
    { ou_id: 1, branch_id: 1, game_company_id: 1, game_main_cate_id: 1 },
    { unique: true, background: true, name: "agent_fee_unique" },
  );
  console.log("  ✔ agent_fees: agent_fee_unique");

  const countFees = await feesCol.countDocuments();

  await db
    .collection("agents")
    .createIndex(
      { ou_id: 1, branch_id: 1 },
      { unique: true, background: true, name: "agents_uniq_ou_branch" },
    );
  console.log("  ✔ agents: agents_uniq_ou_branch");

  await db
    .collection("agent_iv")
    .createIndex(
      { iv_no: 1 },
      { unique: true, background: true, name: "invoice_uniq_iv_no" },
    );
  console.log("  ✔ agent_iv: invoice_uniq_iv_no");

  await db
    .collection("agent_iv")
    .createIndex(
      { ou_id: 1, branch_id: 1, billing_month: 1 },
      { background: true, name: "invoice_by_ou_branch_month" },
    );
  console.log("  ✔ agent_iv: invoice_by_ou_branch_month");

  await db
    .collection("agent_iv_transaction")
    .createIndex(
      { ref_iv_id: 1, company_id: 1, main_category_id: 1 },
      { unique: true, background: true, name: "txn_uniq_invoice_company_cate" },
    );
  console.log("  ✔ agent_iv_transaction: txn_uniq_invoice_company_cate");

  await db
    .collection("agent_iv_transaction")
    .createIndex(
      { ref_iv_id: 1, fee: 1 },
      { background: true, name: "txn_by_invoice" },
    );
  console.log("  ✔ agent_iv_transaction: txn_by_invoice");

  console.log("");
  console.log("=== สรุป ===");
  console.log(`  documents in agent_fees: ${countFees}`);
}

run()
  .catch((err) => {
    console.error(`[setup-indexes] Error: ${err.message}`);
    process.exit(1);
  })
  .finally(() => client.close());
