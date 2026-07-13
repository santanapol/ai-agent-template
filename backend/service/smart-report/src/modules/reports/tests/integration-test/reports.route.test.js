import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";

const RUN = Boolean(
  process.env.MONGODB_URI &&
  process.env.DB_NAME &&
  process.env.MONGODB_URI_READ,
);

if (!RUN) {
  describe("reports.route (skipped — no MONGODB_URI/DB_NAME/MONGODB_URI_READ)", () => {
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
  const { DOWNLOAD_HISTORY_COLLECTION } =
    await import("../../download-history.repository.js");
  const { getStorageDir } = await import("../../file-exporter.service.js");
  const { buildEtag } = await import("../../../../lib/etag.js");
  const { buildMeshHeaders } =
    await import("../../../../lib/test-helpers/mesh-headers.js");
  const { createGatedReport } =
    await import("../../../../lib/test-helpers/gated-report.js");

  const dbName = process.env.DB_NAME;

  describe("smart-reports CRUD & execution routes (integration)", () => {
    let app;
    let db;
    let reportId;
    let etag;
    let historyFileName;

    before(async () => {
      db = await connectDatabase();
      await connectReadDatabase();
      await ensureReportIndexes(db);
      await db.collection(REPORTS_COLLECTION).deleteMany({});
      await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});
      app = await buildApp();
    });

    after(async () => {
      await db.collection(REPORTS_COLLECTION).deleteMany({});
      await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});
      if (historyFileName) {
        await rm(path.join(getStorageDir(), historyFileName), {
          force: true,
        });
      }
      await app.close();
      await closeReadDatabase();
      await closeDatabase();
    });

    test("POST / creates a report (201 CREATED + ETag)", async () => {
      const headers = buildMeshHeaders();
      const response = await createGatedReport(app, headers, {
        name: `Integration Report ${Date.now()}`,
        script: `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`,
        outputFormat: "csv",
      });

      assert.equal(response.statusCode, 201);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.code, "CREATED");
      assert.ok(body.data.id);
      assert.equal(body.data.validationStatus, "valid");
      assert.ok(body.data.compiledScript);
      assert.ok(response.headers.etag);

      reportId = body.data.id;
      etag = response.headers.etag;
    });

    test("GET /:id returns the created report (200)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, reportId);
      assert.ok(body.data.script);
      assert.ok(body.data.compiledScript);
      assert.equal(body.data.outputFormat, "csv");
      assert.equal(body.data.validationStatus, "valid");
    });

    test("POST / with a duplicate name returns 409 DUPLICATE", async () => {
      const report = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });

      const response = await createGatedReport(app, buildMeshHeaders(), {
        name: report.name,
        script: report.script,
        outputFormat: "csv",
      });

      assert.equal(response.statusCode, 409);
      assert.equal(response.json().code, "DUPLICATE");
    });

    test("GET / lists reports including the created one", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.ok(body.data.some((report) => report.id === reportId));
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 20);
      assert.ok(body.pagination.total >= 1);
      assert.ok(body.pagination.totalPages >= 1);
    });

    test("GET /?limit=1 paginates the report list", async () => {
      const extraNames = [`Extra A ${Date.now()}`, `Extra B ${Date.now()}`];
      for (const name of extraNames) {
        const created = await createGatedReport(app, buildMeshHeaders(), {
          name,
          script: `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`,
          outputFormat: "csv",
        });
        assert.equal(created.statusCode, 201);
      }

      const firstPage = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?page=1&limit=1",
        headers: buildMeshHeaders(),
      });
      assert.equal(firstPage.statusCode, 200);
      const firstBody = firstPage.json();
      assert.equal(firstBody.data.length, 1);
      assert.equal(firstBody.pagination.page, 1);
      assert.equal(firstBody.pagination.limit, 1);
      assert.ok(firstBody.pagination.total >= 3);
      assert.ok(firstBody.pagination.totalPages >= 3);

      const secondPage = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?page=2&limit=1",
        headers: buildMeshHeaders(),
      });
      assert.equal(secondPage.statusCode, 200);
      const secondBody = secondPage.json();
      assert.equal(secondBody.data.length, 1);
      assert.notEqual(secondBody.data[0].id, firstBody.data[0].id);
    });

    test("GET /?q filters reports by name", async () => {
      const report = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/smart-reports?q=${encodeURIComponent(report.name.slice(0, 8))}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.some((item) => item.id === reportId));
    });

    test("GET /?enabled=false returns only disabled reports", async () => {
      const disabled = await createGatedReport(app, buildMeshHeaders(), {
        name: `Disabled Report ${Date.now()}`,
        script: `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`,
        outputFormat: "csv",
        enabled: false,
      });
      assert.equal(disabled.statusCode, 201);
      const disabledId = disabled.json().data.id;

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?enabled=false",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.every((item) => item.enabled === false));
      assert.ok(body.data.some((item) => item.id === disabledId));
      assert.ok(!body.data.some((item) => item.id === reportId));
    });

    test("GET /?schedule=manual returns only manual reports", async () => {
      const manual = await createGatedReport(app, buildMeshHeaders(), {
        name: `Manual Report ${Date.now()}`,
        script: `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`,
        outputFormat: "csv",
        schedule: null,
      });
      assert.equal(manual.statusCode, 201);
      const manualId = manual.json().data.id;

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?schedule=manual",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.every((item) => item.schedule === null));
      assert.ok(body.data.some((item) => item.id === manualId));
    });

    test("GET /?page=0 returns 400 INVALID_PARAM", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?page=0",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });

    test("GET /?page=-1 returns 400 INVALID_PARAM", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?page=-1",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });

    test("GET /?limit=0 returns 400 INVALID_PARAM", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?limit=0",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });

    test("GET /?limit=200 accepts backoffice list page size", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?limit=200",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.pagination.limit, 200);
    });

    test("GET /?limit=201 returns 400 INVALID_PARAM (exceeds max)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?limit=201",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });

    test("GET /?page=abc returns 400 INVALID_PARAM (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports?page=abc",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.json().code, "INVALID_PARAM");
    });

    test("PUT /:id without If-Match returns 428 PRECONDITION_REQUIRED", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: buildMeshHeaders(),
        payload: { description: "updated" },
      });

      assert.equal(response.statusCode, 428);
      assert.equal(response.json().code, "PRECONDITION_REQUIRED");
    });

    test("PUT /:id with a stale If-Match returns 412 VERSION_CONFLICT", async () => {
      const staleEtag = buildEtag(new Date("2020-01-01T00:00:00.000Z"));

      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": staleEtag },
        payload: { description: "updated" },
      });

      assert.equal(response.statusCode, 412);
      assert.equal(response.json().code, "VERSION_CONFLICT");
    });

    test("PUT /:id with a valid If-Match updates the report (200 + new ETag)", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
        payload: { description: "updated description" },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.data, null);
      assert.ok(response.headers.etag);
      assert.notEqual(response.headers.etag, etag);

      etag = response.headers.etag;
    });

    test("PUT /:id ignores compiledScript when script is not changing", async () => {
      const before = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });
      const maliciousCompiled =
        "withReport(async () => { return [{ hacked: true }]; });";

      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
        payload: {
          description: "save-gate bypass attempt",
          compiledScript: maliciousCompiled,
        },
      });

      assert.equal(response.statusCode, 200);

      const after = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });
      assert.equal(after.compiledScript, before.compiledScript);
      assert.notEqual(after.compiledScript, maliciousCompiled);
      assert.equal(after.description, "save-gate bypass attempt");

      etag = response.headers.etag;
    });

    test("PUT /:id rejects script change without testRunToken (422)", async () => {
      const { compileBoosterScript } =
        await import("../../script-compiler.service.js");
      const newScript = `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({ name: "changed" });`;
      const compiled = compileBoosterScript(newScript);
      assert.equal(compiled.success, true);

      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
        payload: {
          script: newScript,
          compiledScript: compiled.compiledScript,
        },
      });

      assert.equal(response.statusCode, 422);
      assert.equal(response.json().code, "REPORT_NOT_TESTED");
    });

    test("PUT /:id accepts script change with valid testRunToken (200)", async () => {
      const { compileBoosterScript } =
        await import("../../script-compiler.service.js");
      const newScript = `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({ description: "gate-updated" });`;
      const compiled = compileBoosterScript(newScript);
      assert.equal(compiled.success, true);

      const validateResponse = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/validate",
        headers: buildMeshHeaders(),
        payload: { script: newScript },
      });
      assert.equal(validateResponse.statusCode, 200);
      const compiledScript = validateResponse.json().data.compiledScript;

      const testRunResponse = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports/test-run",
        headers: buildMeshHeaders(),
        payload: { script: newScript, compiledScript },
      });
      assert.equal(testRunResponse.statusCode, 200);
      const testRunToken = testRunResponse.json().data.testRunToken;

      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
        payload: { script: newScript, compiledScript, testRunToken },
      });

      assert.equal(response.statusCode, 200);
      const after = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });
      assert.equal(after.script, newScript);
      assert.equal(after.compiledScript, compiledScript);
      assert.equal(after.validationStatus, "valid");

      etag = response.headers.etag;
    });

    test("POST /:id/run executes the report and records download history (200)", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/smart-reports/${reportId}/run`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, "success");
      assert.equal(body.data.reportId, reportId);
      assert.ok(body.data.fileName);

      historyFileName = body.data.fileName;
    });

    test("GET /history lists the download history record", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/smart-reports/history",
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.some((entry) => entry.fileName === historyFileName));
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 20);
      assert.ok(body.pagination.total >= 1);
      assert.ok(body.pagination.totalPages >= 1);
    });

    test("GET /history?reportId filters history for one report", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/smart-reports/history?reportId=${reportId}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.length >= 1);
      assert.ok(body.data.every((entry) => entry.reportId === reportId));
      assert.ok(body.data.some((entry) => entry.fileName === historyFileName));
    });

    test("GET /download/:fileId streams the exported CSV file (200)", async () => {
      const history = await db
        .collection(DOWNLOAD_HISTORY_COLLECTION)
        .findOne({ fileName: historyFileName });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/smart-reports/download/${history._id.toHexString()}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers["content-type"], "text/csv");
      assert.match(response.headers["content-disposition"], /attachment/);
      assert.match(response.headers["content-disposition"], /\.csv/);
    });

    test("GET /download/:fileId returns 404 RESOURCE_NOT_FOUND for an unknown id", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/smart-reports/download/${new ObjectId().toHexString()}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 404);
      assert.equal(response.json().code, "RESOURCE_NOT_FOUND");
    });

    test("DELETE /:id without If-Match returns 428 PRECONDITION_REQUIRED", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 428);
      assert.equal(response.json().code, "PRECONDITION_REQUIRED");
    });

    test("DELETE /:id with a valid If-Match deletes the report (200)", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.data, null);
    });

    test("PUT /:id on a deleted report returns 404 RESOURCE_NOT_FOUND", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/v1/smart-reports/${reportId}`,
        headers: { ...buildMeshHeaders(), "if-match": etag },
        payload: { description: "x" },
      });

      assert.equal(response.statusCode, 404);
      assert.equal(response.json().code, "RESOURCE_NOT_FOUND");
    });

    test("POST /:id/run on an unknown report returns 404 RESOURCE_NOT_FOUND", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/smart-reports/${new ObjectId().toHexString()}/run`,
        headers: buildMeshHeaders(),
      });

      assert.equal(response.statusCode, 404);
      assert.equal(response.json().code, "RESOURCE_NOT_FOUND");
    });
  });
}
