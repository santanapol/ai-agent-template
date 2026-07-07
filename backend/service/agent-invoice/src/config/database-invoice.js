import { MongoClient } from "mongodb";

import { DB_OPTIONS } from "./database-options.js";

let client = null;
let db = null;

function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/]*@/, "//***:***@");
}

function resolveConfig() {
  const uri =
    process.env.MONGODB_URI_INVOICE ??
    process.env.MONGODB_URI_ORG ??
    process.env.MONGODB_URI;
  const name =
    process.env.MONGODB_DB_INVOICE ??
    process.env.MONGODB_DB_ORG ??
    process.env.DB_NAME;
  if (!uri || !name) {
    throw new Error(
      "[Database] Missing MONGODB_URI + DB_NAME (or legacy MONGODB_URI_INVOICE / MONGODB_DB_INVOICE).",
    );
  }
  return { uri, name };
}

/**
 * Invoice API connection — database `zero-agent-invoice` (prod, `MONGODB_DB_INVOICE`).
 * Collections: agent_iv, agent_iv_transaction, agent_fees
 */
export async function connectInvoiceDatabase() {
  if (db) return db;

  const { uri, name } = resolveConfig();
  client = new MongoClient(uri, DB_OPTIONS);

  try {
    await client.connect();
    db = client.db(name);
    return db;
  } catch (error) {
    const message = `[Database] Failed to connect invoice database (${redactMongoUri(uri)})`;
    if (error instanceof Error) {
      error.message = `${message}: ${error.message}`;
      throw error;
    }
    throw new Error(message);
  }
}

export function getInvoiceDatabase() {
  if (!db) throw new Error("[Database] Call connectInvoiceDatabase() first.");
  return db;
}

/** @deprecated Use getInvoiceDatabase */
export function getOrgDatabase() {
  return getInvoiceDatabase();
}

/** @deprecated Use connectInvoiceDatabase */
export async function connectOrgDatabase() {
  return connectInvoiceDatabase();
}

export async function closeInvoiceDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function pingInvoiceDatabase(timeoutMs = 1000) {
  const database = getInvoiceDatabase();
  await Promise.race([
    database.command({ ping: 1 }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Mongo ping timeout")), timeoutMs);
    }),
  ]);
}
