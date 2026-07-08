import { MongoClient } from "mongodb";

const DB_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  writeConcern: { w: "majority", j: true, wtimeoutMS: 5000 },
  readPreference: "primaryPreferred",
};

/** @type {MongoClient | null} */
let client = null;

/** @type {import('mongodb').Db | null} */
let db = null;

export async function connectDatabase() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI_READ ?? process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_BRANCH;

  if (!uri || !dbName) {
    throw new Error(
      "[Database] Missing MONGODB_URI_READ (or MONGODB_URI) and MONGODB_DB_BRANCH config.",
    );
  }

  client = new MongoClient(uri, DB_OPTIONS);
  await client.connect();
  db = client.db(dbName);

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error("[Database] Call connectDatabase() first.");
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

export function isDatabaseConnected() {
  return db !== null;
}
