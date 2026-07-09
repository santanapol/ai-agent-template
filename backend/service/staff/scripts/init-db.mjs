#!/usr/bin/env node
/**
 * Indexes + optional $jsonSchema for staff_profiles.
 *
 *   npm run init:db
 *   node --env-file=.env scripts/init-db.mjs
 */
import { MongoClient } from "mongodb";
import { COLLECTION_VALIDATORS } from "./collection-validators.mjs";
import { applyCollectionValidators } from "../../../../scripts/ops/apply-collection-validator-lib.mjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (use --env-file=.env)");
  process.exit(1);
}

const dbName = process.env.DB_NAME;
if (!dbName) {
  console.error("DB_NAME is required");
  process.exit(1);
}

const COLLECTION = "staff_profiles";

const PROFILE_INDEXES = [
  {
    keys: { user_id: 1 },
    options: { name: "uniq_user_id", unique: true, background: true },
  },
  {
    keys: { ou_id: 1, branch_id: 1, code: 1 },
    options: { name: "uniq_ou_branch_code", unique: true, background: true },
  },
  {
    keys: { ou_id: 1, branch_id: 1, status: 1, upd_date: -1 },
    options: { name: "list_by_branch_status", background: true },
  },
  {
    keys: { ou_id: 1, status: 1, upd_date: -1 },
    options: { name: "list_archived_by_ou", background: true },
  },
];

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const col = db.collection(COLLECTION);

console.log("=== init-db: staff-service ===");
console.log(`Database: ${db.databaseName}`);
console.log(`Collection: ${COLLECTION}`);
console.log("");

console.log("Creating indexes (database-erd.md)...");
for (const { keys, options } of PROFILE_INDEXES) {
  await col.createIndex(keys, options);
  console.log(`  ok ${options.name}`);
}
console.log("");

console.log("Applying $jsonSchema validator (moderate)...");
await applyCollectionValidators(db, COLLECTION_VALIDATORS);
console.log("");

const count = await col.countDocuments();
console.log("=== summary ===");
console.log(`  documents in ${COLLECTION}: ${count}`);

await client.close();
