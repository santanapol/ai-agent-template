#!/usr/bin/env node
/**
 * Read-only: compare live MongoDB collection validators to registry and/or prod baseline.
 *
 *   node scripts/ops/verify-validators.mjs --harness
 *   node scripts/ops/verify-validators.mjs --staging
 *   node scripts/ops/verify-validators.mjs --baseline=docs/audit/prod-schema-baseline-2026-07-09.json --harness
 *   node scripts/ops/verify-validators.mjs --env-file=backend/auth/.env.prod --db=zero-platform
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VALIDATORS_BY_DB } from "./collection-validator-registry.mjs";
import {
  DEFAULT_PROD_BASELINE,
  HARNESS_TARGETS,
  STAGING_TARGETS,
  matchBaselineDatabase,
  parseEnvFile,
  resolveDbName,
} from "./schema-verify-targets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const require = createRequire(path.join(ROOT, "backend/auth/package.json"));
const { MongoClient } = require("mongodb");

function parseArgs(argv) {
  const out = {
    envFile: null,
    db: null,
    harness: false,
    staging: false,
    baseline: null,
  };
  for (const arg of argv) {
    if (arg === "--harness") out.harness = true;
    else if (arg === "--staging") out.staging = true;
    else if (arg.startsWith("--env-file=")) out.envFile = arg.slice(11);
    else if (arg.startsWith("--db=")) out.db = arg.slice(5);
    else if (arg.startsWith("--baseline=")) out.baseline = arg.slice(11);
  }
  return out;
}

function schemaFingerprint(schema) {
  return JSON.stringify(schema);
}

function loadBaseline(baselinePath) {
  const full = path.isAbsolute(baselinePath)
    ? baselinePath
    : path.join(ROOT, baselinePath);
  return JSON.parse(readFileSync(full, "utf8"));
}

function findBaselineDb(baseline, liveDb, registryDb) {
  return baseline.databases.find(
    (d) =>
      matchBaselineDatabase(liveDb, d.database) ||
      matchBaselineDatabase(registryDb, d.database),
  );
}

async function verifyAgainstRegistry(client, liveDbName, registryDb) {
  const specs = VALIDATORS_BY_DB[registryDb];
  if (!specs) {
    return [`Unknown database in registry: ${registryDb}`];
  }
  const db = client.db(liveDbName);
  const errors = [];
  for (const { collection, schema } of specs) {
    const infos = await db.listCollections({ name: collection }).toArray();
    if (!infos.length) {
      errors.push(`${liveDbName}.${collection}: collection missing`);
      continue;
    }
    const opts = infos[0].options ?? {};
    if (opts.validationLevel !== "moderate") {
      errors.push(
        `${liveDbName}.${collection}: validationLevel=${opts.validationLevel ?? "none"} (expected moderate)`,
      );
    }
    const liveSchema = opts.validator?.$jsonSchema;
    if (!liveSchema) {
      errors.push(`${liveDbName}.${collection}: missing validator.$jsonSchema`);
      continue;
    }
    if (schemaFingerprint(liveSchema) !== schemaFingerprint(schema)) {
      errors.push(`${liveDbName}.${collection}: schema mismatch vs registry`);
    }
  }
  return errors;
}

async function verifyAgainstBaseline(
  client,
  liveDbName,
  registryDb,
  baselineDb,
) {
  const specs = VALIDATORS_BY_DB[registryDb];
  if (!specs) {
    return [`Unknown database in registry: ${registryDb}`];
  }
  const db = client.db(liveDbName);
  const baselineByName = new Map(
    (baselineDb.collections ?? []).map((c) => [c.name, c]),
  );
  const errors = [];
  for (const { collection } of specs) {
    const expected = baselineByName.get(collection);
    if (!expected) {
      errors.push(
        `${liveDbName}.${collection}: missing from prod baseline (registry collection)`,
      );
      continue;
    }
    const infos = await db.listCollections({ name: collection }).toArray();
    if (!infos.length) {
      errors.push(`${liveDbName}.${collection}: collection missing`);
      continue;
    }
    const opts = infos[0].options ?? {};
    if (
      expected.validationLevel &&
      opts.validationLevel !== expected.validationLevel
    ) {
      errors.push(
        `${liveDbName}.${collection}: validationLevel=${opts.validationLevel ?? "none"} (expected ${expected.validationLevel})`,
      );
    }
    const liveSchema = opts.validator?.$jsonSchema;
    const expectedSchema = expected.validator?.$jsonSchema;
    if (!expectedSchema) {
      errors.push(
        `${liveDbName}.${collection}: prod baseline has no validator.$jsonSchema`,
      );
      continue;
    }
    if (!liveSchema) {
      errors.push(`${liveDbName}.${collection}: missing validator.$jsonSchema`);
      continue;
    }
    if (schemaFingerprint(liveSchema) !== schemaFingerprint(expectedSchema)) {
      errors.push(
        `${liveDbName}.${collection}: schema mismatch vs prod baseline`,
      );
    }
  }
  return errors;
}

async function connectFromTarget(target) {
  const { envFile, uriKey, dbKey, registryDb } = target;
  const env = parseEnvFile(readFileSync(path.join(ROOT, envFile), "utf8"));
  const uri = env[uriKey] || env.DATABASE_URI || env.MONGODB_URI;
  if (!uri) throw new Error(`Missing ${uriKey} in ${envFile}`);
  const liveDb = resolveDbName(env, uriKey, dbKey);
  if (!liveDb)
    throw new Error(`Could not resolve database name from ${envFile}`);
  const client = new MongoClient(uri);
  await client.connect();
  return { client, liveDb, registryDb };
}

async function runTargets(targets, label, baseline) {
  console.log(`verify-validators (${label})`);
  const allErrors = [];
  for (const t of targets) {
    const { client, liveDb, registryDb } = await connectFromTarget(t);
    let errors;
    if (baseline) {
      const baselineDb = findBaselineDb(baseline, liveDb, registryDb);
      if (!baselineDb) {
        errors = [`No prod baseline entry for ${liveDb} (${registryDb})`];
      } else {
        errors = await verifyAgainstBaseline(
          client,
          liveDb,
          registryDb,
          baselineDb,
        );
      }
    } else {
      errors = await verifyAgainstRegistry(client, liveDb, registryDb);
    }
    await client.close();
    if (errors.length) {
      allErrors.push(...errors);
      for (const e of errors) console.error(`  ✗ ${e}`);
    } else {
      const mode = baseline ? "baseline" : "registry";
      console.log(
        `  ✓ ${liveDb} (${VALIDATORS_BY_DB[registryDb].length} collections, ${mode})`,
      );
    }
  }
  return allErrors;
}

const args = parseArgs(process.argv.slice(2));
const baseline = args.baseline ? loadBaseline(args.baseline) : null;
const modeLabel = baseline ? "baseline" : "registry";
let failures = 0;

if (args.harness) {
  const label = baseline ? `--harness, ${modeLabel}` : "--harness";
  failures = (await runTargets(HARNESS_TARGETS, label, baseline)).length;
} else if (args.staging) {
  const label = baseline ? `--staging, ${modeLabel}` : "--staging";
  failures = (await runTargets(STAGING_TARGETS, label, baseline)).length;
} else if (args.envFile && args.db) {
  const env = parseEnvFile(
    readFileSync(path.resolve(ROOT, args.envFile), "utf8"),
  );
  const uri = env.DATABASE_URI || env.MONGODB_URI;
  const liveDb =
    env.DB_NAME ||
    resolveDbName(env, "DATABASE_URI", "DB_NAME") ||
    resolveDbName(env, "MONGODB_URI", "DB_NAME") ||
    args.db;
  const client = new MongoClient(uri);
  await client.connect();
  let errors;
  if (baseline) {
    const baselineDb = findBaselineDb(baseline, liveDb, args.db);
    if (!baselineDb) {
      errors = [`No prod baseline entry for ${liveDb}`];
    } else {
      errors = await verifyAgainstBaseline(client, liveDb, args.db, baselineDb);
    }
  } else {
    errors = await verifyAgainstRegistry(client, liveDb, args.db);
  }
  await client.close();
  if (errors.length) {
    failures = errors.length;
    for (const e of errors) console.error(`  ✗ ${e}`);
  } else {
    console.log(`  ✓ ${args.db} (${modeLabel})`);
  }
} else {
  console.error(
    "Usage: node scripts/ops/verify-validators.mjs --harness | --staging",
  );
  console.error(
    "   or: node scripts/ops/verify-validators.mjs [--baseline=PATH] --env-file=PATH --db=NAME",
  );
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nverify-validators failed (${failures} issue(s))`);
  process.exit(1);
}
console.log("\n✓ verify-validators passed");
