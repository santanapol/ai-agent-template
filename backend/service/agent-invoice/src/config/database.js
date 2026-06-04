import { MongoClient } from 'mongodb';

const DB_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  writeConcern: { w: 'majority', j: true, wtimeoutMS: 5000 },
  readPreference: 'primaryPreferred'
};

let client = null;
let db = null;
let sourceClient = null;
let sourceDb = null;

export async function connectDatabase() {
  if (db) return { db, sourceDb };

  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error('[Database] Missing MONGODB_URI or DB_NAME config.');
  }

  client = new MongoClient(process.env.MONGODB_URI, DB_OPTIONS);
  await client.connect();
  db = client.db(process.env.DB_NAME);

  if (process.env.SOURCE_MONGODB_URI) {
    sourceClient = new MongoClient(process.env.SOURCE_MONGODB_URI, DB_OPTIONS);
    await sourceClient.connect();
    sourceDb = sourceClient.db(process.env.SOURCE_DB_NAME || 'gpp_777ww');
  }

  return { db, sourceDb };
}

export function getDatabase() {
  if (!db) throw new Error('[Database] Call connectDatabase() first.');
  return { db, sourceDb };
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
  if (sourceClient) {
    await sourceClient.close();
    sourceClient = null;
    sourceDb = null;
  }
}
