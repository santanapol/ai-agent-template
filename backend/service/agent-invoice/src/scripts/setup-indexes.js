import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
  process.stderr.write('[setup-indexes] Missing MONGODB_URI or DB_NAME\n');
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const collection = db.collection('agent_category_fees');

  await collection.createIndex(
    { agent_id: 1, ou_id: 1, branch_id: 1, company_id: 1, main_cate_id: 1 },
    { unique: true, background: true, name: 'agent_tenant_company_cate_unique' }
  );

  await collection.createIndex(
    { ou_id: 1, branch_id: 1, agent_id: 1 },
    { background: true, name: 'tenant_agent_lookup' }
  );
}

run()
  .then(() => process.stdout.write('[setup-indexes] Indexes created successfully.\n'))
  .catch((err) => {
    process.stderr.write(`[setup-indexes] Error: ${err.message}\n`);
    process.exit(1);
  })
  .finally(() => client.close());
