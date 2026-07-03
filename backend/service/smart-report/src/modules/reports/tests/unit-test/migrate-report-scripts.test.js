import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileBoosterScript } from "../../script-compiler.service.js";
import {
  P1_REPORT_NAME,
  isP1Report,
  parseMigrateArgs,
  processReport,
  buildP1DisableUpdate,
  summarizeResults,
  hasMigrationFailures,
} from "../../../../../scripts/migrate-report-scripts.lib.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "prod-scripts",
);

describe("migrate-report-scripts.lib", () => {
  test("parseMigrateArgs recognizes flags", () => {
    const parsed = parseMigrateArgs([
      "node",
      "migrate.mjs",
      "--dry-run",
      "--test-run",
      "--fail-on-error",
    ]);
    assert.equal(parsed.dryRun, true);
    assert.equal(parsed.testRun, true);
    assert.equal(parsed.failOnError, true);
  });

  test("isP1Report matches exact P1 name", () => {
    assert.equal(isP1Report({ name: P1_REPORT_NAME }), true);
    assert.equal(isP1Report({ name: "Other Report" }), false);
  });

  test("buildP1DisableUpdate sets enabled false", () => {
    const update = buildP1DisableUpdate(new Date("2026-01-01T00:00:00.000Z"));
    assert.equal(update.enabled, false);
    assert.equal(update.validationStatus, "invalid");
    assert.match(String(update.validationErrors[0]), /insert\(\)/);
  });

  test("processReport skips P1 with disable updates", async () => {
    const result = await processReport(
      { _id: "1", name: P1_REPORT_NAME, script: "db.foo.insert({})" },
      { dryRun: false, testRun: false },
      {
        compileBoosterScript,
        runReportScript: async () => [],
        buildReportRunParams: () => ({}),
      },
    );
    assert.equal(result.status, "disabled-p1");
    assert.equal(result.updates?.enabled, false);
  });

  test("processReport compiles group-a fixture (dry-run)", async () => {
    const source = readFileSync(
      join(fixturesDir, "group-a-single-aggregate.js"),
      "utf8",
    );
    const result = await processReport(
      { _id: "2", name: "Fixture A", script: source },
      { dryRun: true, testRun: false },
      {
        compileBoosterScript,
        runReportScript: async () => [],
        buildReportRunParams: () => ({}),
      },
    );
    assert.equal(result.status, "dry-run");
    assert.equal(result.compiled, true);
  });

  test("processReport reports compile failure", async () => {
    const result = await processReport(
      { _id: "3", name: "Broken", script: "db.foo.insert({})" },
      { dryRun: true, testRun: false },
      {
        compileBoosterScript,
        runReportScript: async () => [],
        buildReportRunParams: () => ({}),
      },
    );
    assert.equal(result.status, "compile-failed");
  });

  test("hasMigrationFailures ignores P1 disable", () => {
    assert.equal(
      hasMigrationFailures([{ status: "disabled-p1" }, { status: "updated" }]),
      false,
    );
    assert.equal(hasMigrationFailures([{ status: "compile-failed" }]), true);
  });

  test("summarizeResults counts by status", () => {
    const summary = summarizeResults([
      { status: "updated" },
      { status: "updated" },
      { status: "disabled-p1" },
    ]);
    assert.deepEqual(summary, { updated: 2, "disabled-p1": 1 });
  });
});
