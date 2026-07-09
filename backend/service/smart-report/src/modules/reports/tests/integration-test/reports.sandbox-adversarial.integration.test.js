import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const RUN = Boolean(
  process.env.MONGODB_URI &&
  process.env.DB_NAME &&
  process.env.MONGODB_URI_READ,
);

const WRITE_SCRIPT = `
  const targetDB = db.getSiblingDB("demo");
  targetDB.col.insert({ a: 1 });
`;

if (!RUN) {
  describe("reports.sandbox-adversarial (skipped — no MONGODB_URI/DB_NAME/MONGODB_URI_READ)", () => {
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
  const { REPORTS_COLLECTION, ensureReportIndexes } =
    await import("../../reports.repository.js");
  const { buildMeshHeaders } =
    await import("../../../../lib/test-helpers/mesh-headers.js");
  const { validateAndTestRun } =
    await import("../../../../lib/test-helpers/gated-report.js");

  const dbName = process.env.DB_NAME;

  describe("smart-reports sandbox adversarial routes (integration)", () => {
    let app;
    let db;

    before(async () => {
      db = await connectDatabase();
      await connectReadDatabase();
      await ensureReportIndexes(db);
      await db.collection(REPORTS_COLLECTION).deleteMany({});
      app = await buildApp();
    });

    after(async () => {
      await db.collection(REPORTS_COLLECTION).deleteMany({});
      await app.close();
      await closeReadDatabase();
      await closeDatabase();
    });

    test("POST /validate rejects write operations (VALIDATION_FAILED in errors)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script: WRITE_SCRIPT },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.data.valid, false);
      assert.ok(body.data.errors.length >= 1);
      assert.equal(body.data.errors[0].code, "VALIDATION_FAILED");
    });

    test("POST /test-run rejects write script at compile gate (422 REPORT_NOT_VALIDATED)", async () => {
      const readScript = `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`;
      const validateResponse = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script: readScript },
      });
      assert.equal(validateResponse.statusCode, 200);
      const compiledScript = validateResponse.json().data.compiledScript;

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/test-run",
        headers: buildMeshHeaders(),
        payload: {
          script: WRITE_SCRIPT,
          compiledScript,
        },
      });

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, "REPORT_NOT_VALIDATED");
    });

    test("POST / rejects tampered testRunToken (422 TEST_RUN_TOKEN_INVALID)", async () => {
      const headers = buildMeshHeaders();
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`;
      const { compiledScript, testRunToken } = await validateAndTestRun(
        app,
        headers,
        {
          script,
        },
      );

      const tamperedToken = `${testRunToken.slice(0, -4)}xxxx`;

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports",
        headers,
        payload: {
          name: `Tampered Token Report ${Date.now()}`,
          script,
          compiledScript,
          testRunToken: tamperedToken,
          outputFormat: "csv",
        },
      });

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, "TEST_RUN_TOKEN_INVALID");
    });

    test("POST / rejects expired testRunToken (422 TEST_RUN_TOKEN_INVALID)", async () => {
      const headers = buildMeshHeaders();
      const script = `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`;

      const originalTtl = process.env.TEST_RUN_TOKEN_TTL_MS;
      process.env.TEST_RUN_TOKEN_TTL_MS = "1";

      const { compiledScript, testRunToken } = await validateAndTestRun(
        app,
        headers,
        {
          script,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 5));

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports",
        headers,
        payload: {
          name: `Adversarial Report ${Date.now()}`,
          script,
          compiledScript,
          testRunToken,
          outputFormat: "csv",
        },
      });

      if (originalTtl === undefined) {
        delete process.env.TEST_RUN_TOKEN_TTL_MS;
      } else {
        process.env.TEST_RUN_TOKEN_TTL_MS = originalTtl;
      }

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, "TEST_RUN_TOKEN_INVALID");
    });

    test("GET /download/:fileId rejects path traversal id (400 INVALID_PARAM)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports/download/..%2F..%2Fetc%2Fpasswd",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });
  });
}
