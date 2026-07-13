#!/usr/bin/env node
/**
 * Read-only: list agent_fees rows with no matching agents parent (ou_id + branch_id).
 *
 *   node scripts/ops/audit-orphan-agent-fees.mjs --env-file=backend/service/agent-invoice/.env.staging
 *   node scripts/ops/audit-orphan-agent-fees.mjs --env-file=backend/service/agent-invoice/.env.prod
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile, resolveDbName } from "./schema-verify-targets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const require = createRequire(path.join(ROOT, "backend/auth/package.json"));
const { MongoClient } = require("mongodb");

const EXPECTED_DB = "zero-agent-invoice";

function parseArgs(argv) {
  let envFile = null;
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) envFile = arg.slice(11);
  }
  if (!envFile) {
    console.error("Usage: node scripts/ops/audit-orphan-agent-fees.mjs --env-file=PATH");
    process.exit(1);
  }
  return envFile;
}

const envFile = parseArgs(process.argv.slice(2));
const envPath = path.isAbsolute(envFile) ? envFile : path.join(ROOT, envFile);
const env = parseEnvFile(readFileSync(envPath, "utf8"));
const uri = env.MONGODB_URI || env.DATABASE_URI;
if (!uri) {
  console.error(`Missing MONGODB_URI in ${envFile}`);
  process.exit(1);
}

const dbName =
  env.DB_NAME || resolveDbName(env, "MONGODB_URI", "DB_NAME") || EXPECTED_DB;

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

console.log(`audit-orphan-agent-fees (${envFile})`);
console.log(`Database: ${db.databaseName}`);

if (db.databaseName !== EXPECTED_DB && !db.databaseName.startsWith(`${EXPECTED_DB}_`)) {
  console.warn(
    `  ⚠ unexpected database name (expected ${EXPECTED_DB} or harness suffix)`,
  );
}

const orphans = await db
  .collection("agent_fees")
  .aggregate([
    {
      $lookup: {
        from: "agents",
        let: { ou: "$ou_id", branch: "$branch_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$ou_id", "$$ou"] },
                  { $eq: ["$branch_id", "$$branch"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "agent",
      },
    },
    { $match: { agent: { $size: 0 } } },
    {
      $project: {
        _id: 1,
        ou_id: 1,
        branch_id: 1,
        game_company_id: 1,
        game_main_cate_id: 1,
        upd_by: 1,
      },
    },
  ])
  .toArray();

if (orphans.length === 0) {
  console.log("  ✓ no orphan agent_fees rows");
  await client.close();
  process.exit(0);
}

console.error(`  ✗ found ${orphans.length} orphan agent_fees row(s):`);
for (const row of orphans) {
  const txnCount = await db.collection("agent_iv_transaction").countDocuments({
    branch_id: row.branch_id,
    company_id: row.game_company_id,
    main_category_id: row.game_main_cate_id,
  });
  console.error(
    `    - ${row._id} branch=${row.branch_id} company=${row.game_company_id} cate=${row.game_main_cate_id} related_txns=${txnCount}`,
  );
}

await client.close();
process.exit(1);
