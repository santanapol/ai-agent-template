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
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports",
        headers: buildMeshHeaders(),
        payload: {
          name: `Integration Report ${Date.now()}`,
          script: `db.getSiblingDB(${JSON.stringify(dbName)}).${REPORTS_COLLECTION}.find({});`,
          outputFormat: "csv",
        },
      });

      assert.equal(response.statusCode, 201);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.code, "CREATED");
      assert.ok(body.data.id);
      assert.ok(response.headers.etag);

      reportId = body.data.id;
      etag = response.headers.etag;
    });

    test("POST / with a duplicate name returns 409 DUPLICATE", async () => {
      const report = await db
        .collection(REPORTS_COLLECTION)
        .findOne({ _id: new ObjectId(reportId) });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/smart-reports",
        headers: buildMeshHeaders(),
        payload: {
          name: report.name,
          script: report.script,
          outputFormat: "csv",
        },
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
