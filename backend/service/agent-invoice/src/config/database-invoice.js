import { MongoClient } from "mongodb";

import { DB_OPTIONS } from "./database-options.js";

let client = null;
let db = null;

function resolveConfig() {
  const uri = process.env.MONGODB_URI_INVOICE ?? process.env.MONGODB_URI_ORG;
  const name = process.env.MONGODB_DB_INVOICE ?? process.env.MONGODB_DB_ORG;
  if (!uri || !name) {
    throw new Error(
      "[Database] Missing MONGODB_URI_INVOICE / MONGODB_DB_INVOICE (or legacy MONGODB_URI_ORG / MONGODB_DB_ORG).",
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
  await client.connect();
  db = client.db(name);
  return db;
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

export async function pingInvoiceDatabase() {
  const database = getInvoiceDatabase();
  await database.command({ ping: 1 });
}
