import { MongoClient } from "mongodb";

import { READ_DB_OPTIONS } from "./database-options.js";

let client = null;

function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/]*@/, "//***:***@");
}

/**
 * Read-only connection (`MONGODB_URI_READ`, `secondaryPreferred`) used to run
 * report query scripts. Exposes the raw client so callers can target arbitrary
 * databases via `client.db(name)` (mirrors `db.getSiblingDB()`).
 */
export async function connectReadDatabase() {
  if (client) return client;

  let uri = process.env.MONGODB_URI_READ;
  if (process.env.NODE_ENV === "test") {
    uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  }

  if (!uri) {
    throw new Error("[Database] Missing MONGODB_URI_READ config.");
  }

  const candidate = new MongoClient(uri, READ_DB_OPTIONS);

  try {
    await candidate.connect();
    client = candidate;
    return client;
  } catch (error) {
    throw new Error(
      `[Database] Failed to connect to ${redactMongoUri(uri)}: ${error.message}`,
    );
  }
}

export function getReadClient() {
  if (!client) throw new Error("[Database] Call connectReadDatabase() first.");
  return client;
}

export async function closeReadDatabase() {
  if (client) {
    const closeOptions =
      process.env.NODE_ENV === "test" ? { force: true } : undefined;
    await client.close(closeOptions);
    client = null;
  }
}

export async function pingReadDatabase(timeoutMs = 1000) {
  if (!client) {
    throw new Error("[Database] Database is not connected");
  }

  await Promise.race([
    client.db("admin").command({ ping: 1 }),
    new Promise((_resolve, reject) => {
      setTimeout(
        () => reject(new Error("[Database] Mongo ping timeout")),
        timeoutMs,
      );
    }),
  ]);
}
