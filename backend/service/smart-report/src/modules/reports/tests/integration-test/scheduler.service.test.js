import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ObjectId } from "mongodb";

const RUN = Boolean(
  process.env.MONGODB_URI &&
  process.env.DB_NAME &&
  process.env.MONGODB_URI_READ,
);

if (!RUN) {
  describe("scheduler.service (skipped — no MONGODB_URI/DB_NAME/MONGODB_URI_READ)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase } =
    await import("../../../../config/database.js");
  const { connectReadDatabase, closeReadDatabase } =
    await import("../../../../config/database-read.js");
  const { findDownloadHistory } =
    await import("../../download-history.repository.js");
  const { runReport, startScheduler, stopScheduler } =
    await import("../../scheduler.service.js");

  const FIXTURE_COLLECTION = "scheduler_fixture";
  const dbName = process.env.DB_NAME;

  describe("scheduler.service (integration)", () => {
    before(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await db.collection(FIXTURE_COLLECTION).insertMany([
        { name: "in-range-1", date: new Date("2026-03-01T05:00:00.000Z") },
        { name: "in-range-2", date: new Date("2026-03-01T20:00:00.000Z") },
        { name: "out-of-range", date: new Date("2026-02-27T00:00:00.000Z") },
      ]);
      await connectReadDatabase();
    });

    after(async () => {
      const db = await connectDatabase();
      await db.collection(FIXTURE_COLLECTION).deleteMany({});
      await closeReadDatabase();
      await closeDatabase();
    });

    test("runReport executes the script with date placeholders, exports a file, and records download history", async () => {
      const db = await connectDatabase();
      const report = {
        _id: new ObjectId(),
        name: "Scheduler Range Report",
        script: `
          const mainDB = db.getSiblingDB(${JSON.stringify(dbName)});
          mainDB.${FIXTURE_COLLECTION}.find({
            date: { $gte: ISODate("{{startDate}}"), $lte: ISODate("{{endDate}}") },
          });
        `,
        params: {},
        outputFormat: "csv",
        schedule: null,
        enabled: true,
      };

      // "now" = 2026-03-02T03:00:00.000Z (UTC) → previous day = 2026-03-01 (UTC)
      const now = new Date("2026-03-02T03:00:00.000Z");

      try {
        const record = await runReport(db, report, {
          now,
          triggeredBy: "manual",
        });

        assert.equal(record.status, "success");
        assert.equal(record.recordCount, 2);
        assert.equal(record.triggeredBy, "manual");
        assert.ok(record.filePath);

        const content = await readFile(record.filePath, "utf8");
        assert.match(content, /in-range-1/);
        assert.match(content, /in-range-2/);
        assert.doesNotMatch(content, /out-of-range/);

        const history = await findDownloadHistory(db);
        assert.ok(history.some((entry) => entry._id.equals(record._id)));
      } finally {
        await db
          .collection("download_history")
          .deleteMany({ reportId: report._id });
      }
    });

    test("runReport records a failed entry when the script throws", async () => {
      const db = await connectDatabase();
      const report = {
        _id: new ObjectId(),
        name: "Scheduler Broken Report",
        script: "const x = ;",
        params: {},
        outputFormat: "csv",
        schedule: null,
        enabled: true,
      };

      try {
        const record = await runReport(db, report, {
          now: new Date("2026-03-02T03:00:00.000Z"),
          triggeredBy: "manual",
        });

        assert.equal(record.status, "failed");
        assert.equal(record.recordCount, null);
        assert.match(record.error, /Script execution failed/);
      } finally {
        await db
          .collection("download_history")
          .deleteMany({ reportId: report._id });
      }
    });

    test("startScheduler registers a cron task per enabled scheduled report; execute() runs it and stopScheduler stops it", async () => {
      const db = await connectDatabase();
      const { insertReport } = await import("../../reports.repository.js");

      const report = {
        _id: new ObjectId(),
        name: `Scheduler All Rows Report ${Date.now()}`,
        script: `db.getSiblingDB(${JSON.stringify(dbName)}).${FIXTURE_COLLECTION}.find({});`,
        params: {},
        outputFormat: "csv",
        schedule: { frequency: "daily", hour: 1, minute: 0 },
        enabled: true,
        cr_by: "system",
        cr_date: new Date(),
        cr_prog: "/api/v1/smart-reports",
        upd_by: "system",
        upd_date: new Date(),
        upd_prog: "/api/v1/smart-reports",
      };
      await insertReport(db, report);

      let tasks = [];
      try {
        tasks = await startScheduler(db);
        const ownTask = tasks.find((entry) =>
          entry.reportId.equals(report._id),
        );
        assert.ok(ownTask, "expected a scheduled task for the inserted report");

        await ownTask.task.execute();

        const history = await findDownloadHistory(db);
        const record = history.find((entry) =>
          entry.reportId.equals(report._id),
        );
        assert.ok(record, "expected a download history record after execute()");
        assert.equal(record.status, "success");
        assert.equal(record.recordCount, 3);
      } finally {
        stopScheduler(tasks);
        await db.collection("reports").deleteOne({ _id: report._id });
        await db
          .collection("download_history")
          .deleteMany({ reportId: report._id });
      }
    });
  });
}
