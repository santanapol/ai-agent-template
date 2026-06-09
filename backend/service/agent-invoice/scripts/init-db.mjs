#!/usr/bin/env node
import { MongoClient } from 'mongodb';

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
  
  console.log('=== init-db: agent-invoice-service ===');
  console.log(`Database: ${db.databaseName}`);
  console.log('');
  console.log('▶ สร้าง indexes...');

  const collection = db.collection('agent_category_fees');

  await collection.createIndex(
    { agent_id: 1, ou_id: 1, branch_id: 1, company_id: 1, main_cate_id: 1 },
    { unique: true, background: true, name: 'agent_tenant_company_cate_unique' }
  );
  console.log('  ✔ agent_category_fees: agent_tenant_company_cate_unique');

  await collection.createIndex(
    { ou_id: 1, branch_id: 1, agent_id: 1 },
    { background: true, name: 'tenant_agent_lookup' }
  );
  console.log('  ✔ agent_category_fees: tenant_agent_lookup');

  const count = await collection.countDocuments();

  await db.collection('agents').createIndex(
    { ou_id: 1, branch_id: 1 },
    { background: true, name: 'agents_by_ou_branch' }
  );
  console.log('  ✔ agents: agents_by_ou_branch');

  await db.collection('agent_invoice').createIndex(
    { ou_id: 1, branch_id: 1, billing_month: 1 },
    { background: true, name: 'invoice_by_ou_branch_month' }
  );
  console.log('  ✔ agent_invoice: invoice_by_ou_branch_month');

  console.log('');
  console.log('=== สรุป ===');
  console.log(`  documents in agent_category_fees: ${count}`);
}

run()
  .catch((err) => {
    console.error(`[setup-indexes] Error: ${err.message}`);
    process.exit(1);
  })
  .finally(() => client.close());
