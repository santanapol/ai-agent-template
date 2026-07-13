import { MongoClient } from "mongodb";

import { DB_OPTIONS } from "./database-options.js";

let client = null;
let db = null;

function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/]*@/, "//***:***@");
}

/** Primary R/W connection — report definitions & download history (singleton). */
export async function connectDatabase() {
  if (db) return db;

  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error("[Database] Missing MONGODB_URI or DB_NAME config.");
  }

  client = new MongoClient(process.env.MONGODB_URI, DB_OPTIONS);

  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    return db;
  } catch (error) {
    client = null;
    throw new Error(
      `[Database] Failed to connect to ${redactMongoUri(process.env.MONGODB_URI)}: ${error.message}`,
    );
  }
}

export function getDatabase() {
  if (!db) throw new Error("[Database] Call connectDatabase() first.");
  return db;
}

export async function closeDatabase() {
  if (client) {
    const closeOptions =
      process.env.NODE_ENV === "test" ? { force: true } : undefined;
    await client.close(closeOptions);
    client = null;
    db = null;
  }
}

export async function pingDatabase(timeoutMs = 1000) {
  if (!db) {
    throw new Error("[Database] Database is not connected");
  }

  await Promise.race([
    db.command({ ping: 1 }),
    new Promise((_resolve, reject) => {
      setTimeout(
        () => reject(new Error("[Database] Mongo ping timeout")),
        timeoutMs,
      );
    }),
  ]);
}
