import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const RUN = Boolean(
  process.env.MONGODB_URI &&
  process.env.DB_NAME &&
  process.env.MONGODB_URI_READ,
);

if (!RUN) {
  describe("sandbox-runner.service (skipped — no MONGODB_URI/DB_NAME/MONGODB_URI_READ)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase } =
    await import("../../../../config/database.js");
  const { connectReadDatabase, closeReadDatabase } =
    await import("../../../../config/database-read.js");
  const { runReportScript } = await import("../../sandbox-runner.service.js");

  const FIXTURE_COLLECTION = "sandbox_runner_fixture";
  const dbName = process.env.DB_NAME;

  describe("sandbox-runner.service (integration)", () => {
    before(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await db.collection(FIXTURE_COLLECTION).insertMany([
        { category: "alpha", value: 10 },
        { category: "alpha", value: 20 },
        { category: "beta", value: 30 },
      ]);
      await connectReadDatabase();
    });

    after(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await closeReadDatabase();
      await closeDatabase();
    });

    test("rejects when script is not a non-empty string", async () => {
      await assert.rejects(runReportScript({ script: "" }), /non-empty string/);
      await assert.rejects(
        runReportScript({ script: "   " }),
        /non-empty string/,
      );
      await assert.rejects(
        runReportScript({ script: 123 }),
        /non-empty string/,
      );
    });

    test("rejects on script syntax errors", async () => {
      await assert.rejects(
        runReportScript({ script: "const x = ;" }),
        /Script execution failed/,
      );
    });

    test("enforces a timeout for long-running synchronous scripts", async () => {
      await assert.rejects(
        runReportScript({ script: "while (true) {}", timeoutMs: 50 }),
        /timed out/,
      );
    });

    test("blocks access to Node built-in globals", async () => {
      const result = await runReportScript({
        script:
          "({ processType: typeof process, requireType: typeof require, bufferType: typeof Buffer })",
      });
      assert.equal(result.processType, "undefined");
      assert.equal(result.requireType, "undefined");
      assert.equal(result.bufferType, "undefined");
    });

    test("blocks sandbox escape via prototype constructor traversal of context functions", async () => {
      const script = `
        const escapeFn = ObjectId.constructor;
        escapeFn ? escapeFn('return process')() : undefined;
      `;
      const result = await runReportScript({ script });
      assert.strictEqual(result, undefined);
    });

    test("blocks sandbox escape via prototype constructor traversal of db wrapper methods", async () => {
      const script = `
        const sibling = db.getSiblingDB("any");
        const escapeFn = sibling.anyCollection.find.constructor;
        escapeFn ? escapeFn('return process')() : undefined;
      `;
      const result = await runReportScript({ script });
      assert.strictEqual(result, undefined);
    });

    test("supports ObjectId in the sandbox context", async () => {
      const result = await runReportScript({
        script: '({ id: ObjectId("507f1f77bcf86cd799439011").toHexString() })',
      });
      assert.equal(result.id, "507f1f77bcf86cd799439011");
    });

    test("supports ISODate in the sandbox context", async () => {
      const result = await runReportScript({
        script: 'ISODate("2026-01-01T00:00:00.000Z").toISOString()',
      });
      assert.equal(result, "2026-01-01T00:00:00.000Z");
    });

    test("supports params passed into the sandbox context", async () => {
      const result = await runReportScript({
        script: "params.multiplier * 2",
        params: { multiplier: 21 },
      });
      assert.equal(result, 42);
    });

    test("find via db.getSiblingDB returns an array", async () => {
      const script = `
        const mainDB = db.getSiblingDB(${JSON.stringify(dbName)});
        mainDB.${FIXTURE_COLLECTION}.find({ category: "alpha" });
      `;
      const result = await runReportScript({ script });
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 2);
    });

    test("aggregate via db.getSiblingDB returns an array", async () => {
      const script = `
        const mainDB = db.getSiblingDB(${JSON.stringify(dbName)});
        mainDB.${FIXTURE_COLLECTION}.aggregate([
          { $match: { category: "alpha" } },
          { $sort: { value: -1 } },
          { $project: { _id: 0, value: 1 } },
        ]);
      `;
      const result = await runReportScript({ script });
      assert.deepEqual(result, [{ value: 20 }, { value: 10 }]);
    });

    test("findOne via db.getSiblingDB returns a single object", async () => {
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.findOne({ category: "beta" });`;
      const result = await runReportScript({ script });
      assert.equal(result.category, "beta");
      assert.equal(result.value, 30);
    });

    test("findOne via db.getSiblingDB returns null when not found", async () => {
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.findOne({ category: "missing" });`;
      const result = await runReportScript({ script });
      assert.equal(result, null);
    });
  });
}
