#!/usr/bin/env node
/**
 * Migrate existing report definitions: AST compile + optional test-run + DB update.
 * Disables Rolling Commission P1 (insert script) instead of compiling.
 *
 * @see _mission-control/SPEC-script-compiler-validation.md §13
 */
import { MongoClient } from "mongodb";
import { REPORTS_COLLECTION } from "../src/modules/reports/reports.repository.js";
import { compileBoosterScript } from "../src/modules/reports/script-compiler.service.js";
import { runReportScript } from "../src/modules/reports/sandbox-runner.service.js";
import { buildReportRunParams } from "../src/modules/reports/scheduler.service.js";
import {
  connectReadDatabase,
  closeReadDatabase,
} from "../src/config/database-read.js";
import {
  parseMigrateArgs,
  processReport,
  summarizeResults,
  hasMigrationFailures,
  printMigrateHelp,
  P1_REPORT_NAME,
} from "./migrate-report-scripts.lib.js";

const options = parseMigrateArgs(process.argv);

if (options.help) {
  printMigrateHelp();
  process.exit(0);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is required (use --env-file=.env)");
  process.exit(1);
}

if (options.testRun && !options.dryRun && !process.env.MONGODB_URI_READ) {
  console.error("❌ MONGODB_URI_READ is required for --test-run");
  process.exit(1);
}

const dbName = process.env.DB_NAME || "zero-smart-report";
const deps = {
  compileBoosterScript,
  runReportScript,
  buildReportRunParams,
};

console.log("=== migrate-report-scripts ===");
console.log(`Database: ${dbName}`);
console.log(
  `Mode: ${options.dryRun ? "dry-run" : "apply"}${options.testRun ? " + test-run" : ""}`,
);
console.log(`P1 skip target: "${P1_REPORT_NAME}"`);
console.log("");

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

if (options.testRun && !options.dryRun) {
  await connectReadDatabase();
}

const reports = await db.collection(REPORTS_COLLECTION).find({}).sort({ name: 1 }).toArray();
/** @type {Array<Record<string, unknown>>} */
const results = [];

for (const report of reports) {
  const result = await processReport(report, options, deps);
  results.push(result);

  if (!options.dryRun && result.updates && report._id) {
    await db
      .collection(REPORTS_COLLECTION)
      .updateOne({ _id: report._id }, { $set: result.updates });
  }

  const suffix =
    result.status === "updated"
      ? options.testRun
        ? ` (${result.recordCount} rows, ${result.durationMs}ms)`
        : ""
      : result.status === "dry-run" && options.testRun
        ? ` (${result.recordCount} rows)`
        : result.status === "compile-failed"
          ? ` — ${result.errors?.[0]?.message ?? "compile error"}`
          : result.status === "test-run-failed"
            ? ` — ${result.error}`
            : "";

  console.log(`${result.status.padEnd(16)} ${result.reportName}${suffix}`);
}

if (options.testRun && !options.dryRun) {
  await closeReadDatabase();
}
await client.close();

const summary = summarizeResults(results);
console.log("");
console.log("=== Summary ===");
for (const [status, count] of Object.entries(summary).sort()) {
  console.log(`  ${status}: ${count}`);
}

if (options.failOnError && hasMigrationFailures(results)) {
  console.error("");
  console.error("❌ Migration finished with failures (--fail-on-error)");
  process.exit(1);
}

console.log("");
console.log("✔ Migration complete");
