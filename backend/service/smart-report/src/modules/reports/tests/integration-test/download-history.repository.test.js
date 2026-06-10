import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";

const RUN = Boolean(process.env.MONGODB_URI && process.env.DB_NAME);

if (!RUN) {
  describe("download-history.repository (skipped — no MONGODB_URI/DB_NAME)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase } =
    await import("../../../../config/database.js");
  const {
    DOWNLOAD_HISTORY_COLLECTION,
    ensureDownloadHistoryIndexes,
    insertDownloadHistory,
    findDownloadHistory,
  } = await import("../../download-history.repository.js");

  describe("download-history.repository (integration)", () => {
    test("ensureDownloadHistoryIndexes creates the expected indexes", async () => {
      const db = await connectDatabase();
      try {
        const collection = await ensureDownloadHistoryIndexes(db);
        const indexes = await collection.indexes();
        const names = indexes.map((idx) => idx.name);

        assert.ok(names.includes("IDX_DOWNLOAD_HISTORY_REPORT_LIST"));
        assert.ok(names.includes("IDX_DOWNLOAD_HISTORY_RECENT"));
      } finally {
        await closeDatabase();
      }
    });

    test("insertDownloadHistory stores a record and findDownloadHistory returns it sorted by recency", async () => {
      const db = await connectDatabase();
      try {
        await ensureDownloadHistoryIndexes(db);
        await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});

        const reportId = new ObjectId();
        const older = {
          reportId,
          reportName: "Staff Login Log",
          fileName: "staff-login-log-1.csv",
          filePath: "/storage/reports/staff-login-log-1.csv",
          format: "csv",
          status: "success",
          recordCount: 10,
          error: null,
          triggeredBy: "manual",
          startedAt: new Date("2026-01-01T00:00:00.000Z"),
          finishedAt: new Date("2026-01-01T00:00:05.000Z"),
          cr_by: "system",
          cr_date: new Date("2026-01-01T00:00:00.000Z"),
          cr_prog: "/api/v1/smart-reports/:id/run",
        };
        const newer = {
          ...older,
          fileName: "staff-login-log-2.csv",
          filePath: "/storage/reports/staff-login-log-2.csv",
          startedAt: new Date("2026-01-02T00:00:00.000Z"),
          finishedAt: new Date("2026-01-02T00:00:05.000Z"),
          cr_date: new Date("2026-01-02T00:00:00.000Z"),
        };

        const insertedOlder = await insertDownloadHistory(db, older);
        const insertedNewer = await insertDownloadHistory(db, newer);
        assert.ok(insertedOlder._id);
        assert.ok(insertedNewer._id);

        const history = await findDownloadHistory(db);
        assert.equal(history.length, 2);
        assert.equal(history[0].fileName, "staff-login-log-2.csv");
        assert.equal(history[1].fileName, "staff-login-log-1.csv");
        assert.ok(history[0].reportId.equals(reportId));

        await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});
      } finally {
        await closeDatabase();
      }
    });
  });
}
