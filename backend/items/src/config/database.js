import { MongoClient } from 'mongodb';

const DB_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  writeConcern: { w: 'majority', j: true, wtimeoutMS: 5000 },
  readPreference: 'primaryPreferred',
};

let client = null;
let db = null;

export async function connectDatabase() {
  if (db) {
    return db;
  }

  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error('[Database] Missing MONGODB_URI or DB_NAME config.');
  }

  client = new MongoClient(process.env.MONGODB_URI, DB_OPTIONS);
  await client.connect();
  db = client.db(process.env.DB_NAME);

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('[Database] Call connectDatabase() first.');
  }

  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
