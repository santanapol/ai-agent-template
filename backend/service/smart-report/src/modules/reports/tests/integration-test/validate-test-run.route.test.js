import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const RUN = Boolean(
  process.env.MONGODB_URI &&
  process.env.DB_NAME &&
  process.env.MONGODB_URI_READ,
);

if (!RUN) {
  describe("validate-test-run routes (skipped — no MONGODB_URI/DB_NAME/MONGODB_URI_READ)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const buildApp = (await import("../../../../app.js")).default;
  const { connectDatabase, closeDatabase } =
    await import("../../../../config/database.js");
  const { connectReadDatabase, closeReadDatabase } =
    await import("../../../../config/database-read.js");
  const { buildMeshHeaders } =
    await import("../../../../lib/test-helpers/mesh-headers.js");

  const dbName = process.env.DB_NAME;
  const FIXTURE_COLLECTION = "validate_test_run_fixture";

  describe("validate & test-run routes (integration)", () => {
    let app;

    before(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await db.collection(FIXTURE_COLLECTION).insertMany([
        { label: "alpha" },
        { label: "beta" },
      ]);
      await connectReadDatabase();
      app = await buildApp();
    });

    after(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await app.close();
      await closeReadDatabase();
      await closeDatabase();
    });

    test("POST /validate returns compiledScript for valid Booster script", async () => {
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.find({});`;
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.data.valid, true);
      assert.match(body.data.compiledScript, /^withReport\(async \(\) => \{/);
    });

    test("POST /validate returns errors for invalid syntax", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script: "const x = ;" },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.data.valid, false);
      assert.ok(body.data.errors.length > 0);
    });

    test("POST /test-run executes compiled script and returns token", async () => {
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.find({});`;
      const validate = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script },
      });
      const compiledScript = validate.json().data.compiledScript;

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/test-run",
        headers: buildMeshHeaders(),
        payload: { script, compiledScript },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.data.success, true);
      assert.equal(body.data.recordCount, 2);
      assert.ok(body.data.testRunToken);
      assert.ok(body.data.runParams?.startDate);
      assert.ok(body.data.runParams?.endDate);
      assert.ok(Array.isArray(body.data.sample));
      assert.ok(Object.keys(body.data.sample[0] ?? {}).length > 0);
    });

    test("POST / rejects create without testRunToken", async () => {
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.find({});`;
      const validate = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script },
      });
      const compiledScript = validate.json().data.compiledScript;

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports",
        headers: buildMeshHeaders(),
        payload: {
          name: `Gate Test ${Date.now()}`,
          script,
          compiledScript,
          outputFormat: "csv",
        },
      });

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, "REPORT_NOT_TESTED");
    });
  });
}
