#!/usr/bin/env node
/**
 * Read-only: compare MongoDB indexes to prod baseline JSON or ensure-* manifest.
 *
 *   node scripts/ops/verify-indexes.mjs --baseline docs/audit/prod-schema-baseline-2026-07-15.json --harness
 *   node scripts/ops/verify-indexes.mjs --baseline docs/audit/prod-schema-baseline-2026-07-15.json --env-file=backend/auth/.env.prod
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.join(ROOT, 'backend/auth/package.json'));
const { MongoClient } = require('mongodb');

const HARNESS_DBS = [
  { envFile: 'backend/auth/.env.harness', uriKey: 'DATABASE_URI', dbKey: null },
  {
    envFile: 'backend/service/agent-invoice/.env.harness',
    uriKey: 'MONGODB_URI',
    dbKey: 'DB_NAME',
  },
  {
    envFile: 'backend/service/smart-report/.env.harness',
    uriKey: 'MONGODB_URI',
    dbKey: 'DB_NAME',
  },
];

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !m[1].startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

function parseArgs(argv) {
  const out = { baseline: null, envFile: null, harness: false, database: null };
  for (const arg of argv) {
    if (arg === '--harness') out.harness = true;
    else if (arg.startsWith('--baseline=')) out.baseline = arg.slice(11);
    else if (arg.startsWith('--env-file=')) out.envFile = arg.slice(11);
    else if (arg.startsWith('--database=')) out.database = arg.slice(11);
  }
  return out;
}

/** @param {import('mongodb').IndexDescription[]} indexes */
function indexSignature(indexes) {
  return indexes
    .filter((i) => i.name !== '_id_')
    .map((i) =>
      JSON.stringify({
        key: i.key,
        unique: Boolean(i.unique),
        expireAfterSeconds: i.expireAfterSeconds ?? null,
      }),
    )
    .sort()
    .join('|');
}

/**
 * @param {object} baselineDb
 * @param {object} liveDb
 */
function compareDb(baselineDb, liveDb) {
  const errors = [];
  const baselineMap = new Map(baselineDb.collections.map((c) => [c.name, c]));
  const liveMap = new Map(liveDb.collections.map((c) => [c.name, c]));

  for (const [name, expected] of baselineMap) {
    const live = liveMap.get(name);
    if (!live) {
      errors.push(`${baselineDb.database}.${name}: missing collection`);
      continue;
    }
    const expSig = indexSignature(expected.indexes);
    const liveSig = indexSignature(live.indexes);
    if (expSig !== liveSig) {
      errors.push(`${baselineDb.database}.${name}: index mismatch`);
    }
  }
  return errors;
}

async function dumpLiveDb(uri, dbName) {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = dbName ? client.db(dbName) : client.db();
    const collections = [];
    for (const { name } of await db.listCollections().toArray()) {
      collections.push({ name, indexes: await db.collection(name).indexes() });
    }
    return { database: db.databaseName, collections };
  } finally {
    await client.close();
  }
}

function loadBaseline(baselinePath) {
  const full = path.isAbsolute(baselinePath) ? baselinePath : path.join(ROOT, baselinePath);
  return JSON.parse(readFileSync(full, 'utf8'));
}

function resolveDbName(env, uriKey, dbKey) {
  if (dbKey && env[dbKey]) return env[dbKey];
  try {
    const uri = env[uriKey];
    return new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'))
      .pathname.replace(/^\//, '')
      .split('?')[0];
  } catch {
    return null;
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.baseline) {
  console.error('Usage: verify-indexes.mjs --baseline=docs/audit/prod-schema-baseline-*.json [--harness | --env-file=...]');
  process.exit(1);
}

const baseline = loadBaseline(args.baseline);
const allErrors = [];

if (args.harness) {
  for (const target of HARNESS_DBS) {
    const envPath = path.join(ROOT, target.envFile);
    const env = parseEnv(readFileSync(envPath, 'utf8'));
    const uri = env[target.uriKey];
    const dbName = resolveDbName(env, target.uriKey, target.dbKey);
    const live = await dumpLiveDb(uri, dbName);
    const expected = baseline.databases.find(
      (d) =>
        d.database === live.database ||
        d.database === live.database.replace(/_0$/, '') ||
        `${d.database}_0` === live.database,
    );
    if (!expected) {
      console.warn(`⚠ No baseline entry for harness db ${live.database} — skip`);
      continue;
    }
    console.log(`▶ ${live.database}`);
    const errs = compareDb(expected, live);
    if (errs.length === 0) console.log('  ✓ indexes match baseline (non-_id)');
    else errs.forEach((e) => console.log(`  ✗ ${e}`));
    allErrors.push(...errs);
  }
} else if (args.envFile) {
  const envPath = path.isAbsolute(args.envFile) ? args.envFile : path.join(ROOT, args.envFile);
  const env = parseEnv(readFileSync(envPath, 'utf8'));
  const uri = env.DATABASE_URI ?? env.MONGODB_URI;
  const dbName = args.database ?? env.DB_NAME ?? resolveDbName(env, env.DATABASE_URI ? 'DATABASE_URI' : 'MONGODB_URI', 'DB_NAME');
  const live = await dumpLiveDb(uri, dbName);
  const expected = baseline.databases.find((d) => d.database === live.database);
  if (!expected) {
    console.error(`No baseline for database ${live.database}`);
    process.exit(1);
  }
  allErrors.push(...compareDb(expected, live));
} else {
  console.error('Specify --harness or --env-file');
  process.exit(1);
}

if (allErrors.length > 0) {
  console.error(`\n✗ verify-indexes failed (${allErrors.length} issue(s))`);
  process.exit(1);
}
console.log('\n✓ verify-indexes passed');
