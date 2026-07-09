#!/usr/bin/env node
/**
 * Apply $jsonSchema validators (validationLevel: moderate).
 * Schemas: backend service collection-validators.mjs via collection-validator-registry.
 *
 *   node scripts/ops/apply-collection-validators.mjs --staging
 *   node scripts/ops/apply-collection-validators.mjs --prod-all
 *   MONGODB_ADMIN_URI='mongodb://admin@...' node scripts/ops/apply-collection-validators.mjs --prod-all
 *   node scripts/ops/apply-collection-validators.mjs --env-file=backend/auth/.env.prod --db=zero-platform
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VALIDATORS_BY_DB } from "./collection-validator-registry.mjs";
import { applyCollectionValidators } from "./apply-collection-validator-lib.mjs";
import {
  PROD_APPLY_TARGETS,
  STAGING_APPLY_TARGETS,
} from "./schema-verify-targets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const require = createRequire(resolve(ROOT, "backend/auth/package.json"));
const { MongoClient } = require("mongodb");

const PROD_TARGETS = PROD_APPLY_TARGETS;
const STAGING_TARGETS = STAGING_APPLY_TARGETS;

function parseEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function mongoUriFromEnv(env) {
  return (
    process.env.MONGODB_ADMIN_URI || env.DATABASE_URI || env.MONGODB_URI || null
  );
}

async function applyForDb(uri, dbName, only) {
  const specs = VALIDATORS_BY_DB[dbName];
  if (!specs) {
    console.error(`Unknown db: ${dbName}`);
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`\n==> ${dbName}`);
  await applyCollectionValidators(db, specs, only);
  await client.close();
}

async function runTargets(targets, label) {
  console.log(`=== apply-collection-validators (${label}) ===`);
  for (const { env, db } of targets) {
    const envPath = resolve(ROOT, env);
    const parsed = parseEnvFile(envPath);
    const uri = mongoUriFromEnv(parsed);
    if (!uri) {
      console.error(`No DATABASE_URI/MONGODB_URI in ${env}`);
      process.exit(1);
    }
    await applyForDb(uri, db);
  }
  console.log("\n✓ validators applied");
}

const args = process.argv.slice(2);

function argValue(prefix) {
  const eq = args.find((a) => a.startsWith(`${prefix}=`));
  if (eq) return eq.slice(prefix.length + 1);
  const idx = args.indexOf(prefix);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--"))
    return args[idx + 1];
  return null;
}

if (args.includes("--staging")) {
  await runTargets(STAGING_TARGETS, "--staging");
  process.exit(0);
}

if (args.includes("--prod-all")) {
  await runTargets(PROD_TARGETS, "--prod-all");
  process.exit(0);
}

const envFile = argValue("--env-file");
const dbNameArg = argValue("--db");
const only = argValue("--collection");

if (!envFile || !dbNameArg) {
  console.error(
    "Usage: node scripts/ops/apply-collection-validators.mjs --staging | --prod-all",
  );
  console.error(
    "   or: node scripts/ops/apply-collection-validators.mjs --env-file=PATH --db=NAME [--collection=NAME]",
  );
  process.exit(1);
}

const envPath = resolve(ROOT, envFile);
const parsed = parseEnvFile(envPath);
const uri = mongoUriFromEnv(parsed);
if (!uri) {
  console.error("DATABASE_URI or MONGODB_URI required in env file");
  process.exit(1);
}
await applyForDb(uri, dbNameArg.trim(), only);
