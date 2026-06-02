import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zero_platform';

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to database.');

    const db = client.db();
    const collection = db.collection('agent_category_fees');

    // Create unique compound index
    console.log('Creating unique index on agent_id, company_id, main_cate_id...');
    await collection.createIndex(
      { agent_id: 1, company_id: 1, main_cate_id: 1 },
      { unique: true, name: 'agent_company_cate_unique' }
    );
    console.log('Index created successfully!');

  } catch (error) {
    console.error('Error creating index:', error);
  } finally {
    await client.close();
  }
}

run();
