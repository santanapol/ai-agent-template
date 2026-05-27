import { MongoClient } from "mongodb";
import logger from "./logger.js";
import { readEnv } from "./env.js";

const env = readEnv();

const DB_OPTIONS = {
  appName: env.appName,
  maxPoolSize: env.maxPoolSize,
  minPoolSize: env.minPoolSize,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  writeConcern: { w: "majority", j: true, wtimeoutMS: 5000 },
  readPreference: "primaryPreferred",
};

let client = null;
let db = null;

function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/]*@/, "//***:***@");
}

export async function connectDatabase() {
  if (db) return db;

  if (!env.mongoUri || !env.dbName) {
    throw new Error("[Database] Missing MONGODB_URI or DB_NAME config.");
  }

  client = new MongoClient(env.mongoUri, DB_OPTIONS);

  try {
    await client.connect();
    db = client.db(env.dbName);
    return db;
  } catch (error) {
    logger.error(
      { err: error, mongoUri: redactMongoUri(env.mongoUri) },
      "Failed to connect database",
    );
    throw error;
  }
}

export function getDatabase() {
  if (!db) throw new Error("[Database] Call connectDatabase() first.");
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function pingDatabase(timeoutMs = 1000) {
  if (!db) {
    throw new Error("Database is not connected");
  }

  await Promise.race([
    db.command({ ping: 1 }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Mongo ping timeout")), timeoutMs);
    }),
  ]);
}
