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
    findDownloadHistoryPage,
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

    test("findDownloadHistoryPage paginates results sorted by recency", async () => {
      const db = await connectDatabase();
      try {
        await ensureDownloadHistoryIndexes(db);
        await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});

        const reportId = new ObjectId();
        const baseRecord = {
          reportId,
          reportName: "Staff Login Log",
          format: "csv",
          status: "success",
          recordCount: 10,
          error: null,
          triggeredBy: "manual",
          cr_by: "system",
          cr_prog: "/api/v1/smart-reports/:id/run",
        };

        for (const day of [1, 2, 3]) {
          const date = new Date(`2026-01-0${day}T00:00:00.000Z`);
          await insertDownloadHistory(db, {
            ...baseRecord,
            fileName: `staff-login-log-${day}.csv`,
            filePath: `/storage/reports/staff-login-log-${day}.csv`,
            startedAt: date,
            finishedAt: date,
            cr_date: date,
          });
        }

        const firstPage = await findDownloadHistoryPage(db, {
          page: 1,
          limit: 2,
        });
        assert.equal(firstPage.total, 3);
        assert.deepEqual(
          firstPage.items.map((record) => record.fileName),
          ["staff-login-log-3.csv", "staff-login-log-2.csv"],
        );

        const secondPage = await findDownloadHistoryPage(db, {
          page: 2,
          limit: 2,
        });
        assert.equal(secondPage.total, 3);
        assert.equal(secondPage.items.length, 1);
        assert.equal(secondPage.items[0].fileName, "staff-login-log-1.csv");

        await db.collection(DOWNLOAD_HISTORY_COLLECTION).deleteMany({});
      } finally {
        await closeDatabase();
      }
    });
  });
}
