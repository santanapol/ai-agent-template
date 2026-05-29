#!/usr/bin/env node
/**
 * Indexes + optional $jsonSchema for staff_profiles.
 *
 *   npm run init:db
 *   node --env-file=.env scripts/init-db.mjs
 */
import { MongoClient } from "mongodb";

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

const PROFILE_JSON_SCHEMA = {
  bsonType: "object",
  required: [
    "user_id",
    "ou_id",
    "branch_id",
    "status",
    "code",
    "firstname",
    "lastname",
    "email",
    "tel",
    "cr_by",
    "cr_date",
    "cr_prog",
    "upd_by",
    "upd_date",
    "upd_prog",
  ],
  properties: {
    status: { enum: ["active", "archived"] },
    code: { bsonType: "string", minLength: 1, maxLength: 32 },
    firstname: { bsonType: "string", minLength: 1, maxLength: 128 },
    lastname: { bsonType: "string", minLength: 1, maxLength: 128 },
    email: { bsonType: "string", maxLength: 254 },
    tel: { bsonType: "string", maxLength: 16 },
  },
};

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
try {
  await db.command({
    collMod: COLLECTION,
    validator: { $jsonSchema: PROFILE_JSON_SCHEMA },
    validationLevel: "moderate",
  });
  console.log("  ok collMod validator");
} catch (error) {
  if (error.codeName === "NamespaceNotFound") {
    await db.createCollection(COLLECTION, {
      validator: { $jsonSchema: PROFILE_JSON_SCHEMA },
      validationLevel: "moderate",
    });
    console.log("  ok createCollection with validator");
  } else {
    throw error;
  }
}

const count = await col.countDocuments();
console.log("");
console.log("=== summary ===");
console.log(`  documents in ${COLLECTION}: ${count}`);

await client.close();
