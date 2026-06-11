import { test, describe } from "node:test";
import assert from "node:assert/strict";

const RUN = Boolean(process.env.MONGODB_URI && process.env.DB_NAME);

if (!RUN) {
  describe("reports.repository (skipped — no MONGODB_URI/DB_NAME)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase } =
    await import("../../../../config/database.js");
  const {
    REPORTS_COLLECTION,
    ensureReportIndexes,
    insertReport,
    findReports,
    findReportsPage,
  } = await import("../../reports.repository.js");

  describe("reports.repository (integration)", () => {
    test("ensureReportIndexes creates the expected indexes", async () => {
      const db = await connectDatabase();
      try {
        const collection = await ensureReportIndexes(db);
        const indexes = await collection.indexes();
        const names = indexes.map((idx) => idx.name);

        assert.ok(names.includes("IDX_REPORTS_NAME_UNIQUE"));
        assert.ok(names.includes("IDX_REPORTS_ENABLED"));
      } finally {
        await closeDatabase();
      }
    });

    test("insertReport stores a report and findReports returns it", async () => {
      const db = await connectDatabase();
      try {
        await ensureReportIndexes(db);
        await db.collection(REPORTS_COLLECTION).deleteMany({});

        const now = new Date();
        const report = {
          name: `Staff Login Log ${Date.now()}`,
          description: "รายงานบันทึกการเข้าสู่ระบบของ staff",
          script: "db.getSiblingDB('gpp_777ww').su_staff_login_log.find({});",
          params: { startDate: null, endDate: null },
          outputFormat: "csv",
          schedule: null,
          enabled: true,
          cr_by: "system",
          cr_date: now,
          cr_prog: "/api/v1/smart-reports",
          upd_by: "system",
          upd_date: now,
          upd_prog: "/api/v1/smart-reports",
        };

        const inserted = await insertReport(db, report);
        assert.ok(inserted._id);

        const reports = await findReports(db);
        assert.equal(reports.length, 1);
        assert.equal(reports[0].name, report.name);
        assert.equal(reports[0].outputFormat, "csv");
        assert.equal(reports[0].enabled, true);

        await db.collection(REPORTS_COLLECTION).deleteMany({});
      } finally {
        await closeDatabase();
      }
    });

    test("findReportsPage paginates results sorted by name", async () => {
      const db = await connectDatabase();
      try {
        await ensureReportIndexes(db);
        await db.collection(REPORTS_COLLECTION).deleteMany({});

        const now = new Date();
        const baseReport = {
          script: "db.getSiblingDB('gpp_777ww').su_staff_login_log.find({});",
          params: {},
          outputFormat: "csv",
          schedule: null,
          enabled: true,
          cr_by: "system",
          cr_date: now,
          cr_prog: "/api/v1/smart-reports",
          upd_by: "system",
          upd_date: now,
          upd_prog: "/api/v1/smart-reports",
        };

        for (const name of ["Report A", "Report B", "Report C"]) {
          await insertReport(db, { ...baseReport, name });
        }

        const firstPage = await findReportsPage(db, { page: 1, limit: 2 });
        assert.equal(firstPage.total, 3);
        assert.equal(firstPage.items.length, 2);
        assert.deepEqual(
          firstPage.items.map((report) => report.name),
          ["Report A", "Report B"],
        );

        const secondPage = await findReportsPage(db, { page: 2, limit: 2 });
        assert.equal(secondPage.total, 3);
        assert.equal(secondPage.items.length, 1);
        assert.equal(secondPage.items[0].name, "Report C");

        await db.collection(REPORTS_COLLECTION).deleteMany({});
      } finally {
        await closeDatabase();
      }
    });
  });
}
