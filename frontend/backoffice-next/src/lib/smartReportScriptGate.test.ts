import { describe, expect, it } from "vitest";

import {
  buildPreviewTable,
  canSaveScript,
  type EditorSnapshot,
  formatTestRunParamsRange,
  formatTestRunPreviewCount,
  getSaveGateHint,
  getScriptGateStep,
  getTestRunDateTagLabel,
  isEditorDirty,
  normalizeTestRunSample,
  renderPreviewCell,
  scriptRequiresGate,
  scriptUsesRunDateParams,
} from "./smartReportScriptGate";

describe("smartReportScriptGate", () => {
  describe("scriptUsesRunDateParams", () => {
    it("detects params.startDate and params.endDate", () => {
      expect(scriptUsesRunDateParams("const startDate = ISODate(params.startDate);")).toBe(true);
      expect(scriptUsesRunDateParams("ISODate(params.endDate)")).toBe(true);
    });

    it("returns false when script does not reference run date params", () => {
      expect(scriptUsesRunDateParams('const x = new Date("2026-01-01");')).toBe(false);
      expect(scriptUsesRunDateParams("params.multiplier * 2")).toBe(false);
    });
  });

  describe("formatTestRunPreviewCount", () => {
    it("shows total only when sample covers all rows", () => {
      expect(formatTestRunPreviewCount(3, 3)).toBe("3 record(s)");
    });

    it("shows preview fraction when total exceeds sample", () => {
      expect(formatTestRunPreviewCount(120, 5)).toBe("Preview 5 of 120 record(s)");
    });

    it("handles zero records", () => {
      expect(formatTestRunPreviewCount(0, 0)).toBe("0 record(s)");
    });
  });

  describe("formatTestRunParamsRange", () => {
    it("formats same-day UTC range compactly", () => {
      expect(formatTestRunParamsRange("2026-06-29T00:00:00.000Z", "2026-06-29T23:59:59.999Z")).toBe(
        "2026-06-29 00:00 – 23:59 UTC",
      );
    });

    it("returns invalid label for bad dates", () => {
      expect(formatTestRunParamsRange("not-a-date", "also-bad")).toBe("invalid date range");
    });
  });

  describe("scriptRequiresGate", () => {
    it("requires gate for new reports", () => {
      expect(scriptRequiresGate(null, null, "db.col.find({});")).toBe(true);
    });

    it("does not require gate when script matches baseline", () => {
      const script = "db.col.find({});";
      expect(scriptRequiresGate({ id: "1" }, script, script)).toBe(false);
    });

    it("requires gate when script diverges from baseline", () => {
      expect(scriptRequiresGate({ id: "1" }, "db.col.find({});", "db.col.aggregate([]);")).toBe(true);
    });
  });

  describe("getSaveGateHint", () => {
    it("returns null when gate is not required", () => {
      expect(getSaveGateHint(false, "pending")).toBeNull();
    });

    it("returns validate hint when pending", () => {
      expect(getSaveGateHint(true, "pending")).toBe("Validate script first");
    });

    it("returns test-run hint when validated", () => {
      expect(getSaveGateHint(true, "validated")).toBe("Run test before saving");
    });

    it("returns null when tested", () => {
      expect(getSaveGateHint(true, "tested")).toBeNull();
    });
  });

  describe("getScriptGateStep", () => {
    it("maps pending to edit script step", () => {
      expect(getScriptGateStep("pending", false)).toEqual({ current: 0 });
    });

    it("maps validated to test run step", () => {
      expect(getScriptGateStep("validated", false)).toEqual({ current: 2 });
    });

    it("maps tested to save step", () => {
      expect(getScriptGateStep("tested", false)).toEqual({ current: 3 });
    });

    it("marks validate step error when validation failed", () => {
      expect(getScriptGateStep("pending", true)).toEqual({
        current: 1,
        validateStatus: "error",
      });
    });

    it("shows save step when gate is not required", () => {
      expect(getScriptGateStep("validated", false, false)).toEqual({ current: 3 });
    });
  });

  describe("isEditorDirty", () => {
    const baseline: EditorSnapshot = {
      formValues: { name: "Report A", schedule: "manual", outputFormat: "csv" },
      script: "db.col.find({});",
    };

    it("returns false when baseline is null", () => {
      expect(isEditorDirty({ formValues: { name: "X" }, script: "x" }, null)).toBe(false);
    });

    it("returns false when form and script match baseline", () => {
      expect(
        isEditorDirty(
          {
            formValues: { name: "Report A", schedule: "manual", outputFormat: "csv" },
            script: "db.col.find({});",
          },
          baseline,
        ),
      ).toBe(false);
    });

    it("returns true when script changed", () => {
      expect(
        isEditorDirty(
          {
            formValues: baseline.formValues,
            script: "db.col.aggregate([]);",
          },
          baseline,
        ),
      ).toBe(true);
    });

    it("returns true when form values changed", () => {
      expect(
        isEditorDirty(
          {
            formValues: { ...baseline.formValues, name: "Report B" },
            script: baseline.script,
          },
          baseline,
        ),
      ).toBe(true);
    });

    it("normalizes dayjs-like scheduleTime when comparing form values", () => {
      const scheduleTime = { hour: () => 8, minute: () => 30 };
      const baselineWithTime: EditorSnapshot = {
        formValues: { name: "Report A", scheduleTime },
        script: "db.col.find({});",
      };
      expect(
        isEditorDirty(
          {
            formValues: { name: "Report A", scheduleTime: { hour: () => 8, minute: () => 30 } },
            script: "db.col.find({});",
          },
          baselineWithTime,
        ),
      ).toBe(false);
    });
  });

  describe("canSaveScript", () => {
    it("allows save when gate is not required", () => {
      expect(canSaveScript(false, "pending", null, null)).toBe(true);
    });

    it("blocks save until validate and test run complete", () => {
      expect(canSaveScript(true, "pending", null, null)).toBe(false);
      expect(canSaveScript(true, "validated", null, "withReport(async () => {});")).toBe(false);
    });

    it("allows save after successful test run", () => {
      expect(canSaveScript(true, "tested", "token", "withReport(async () => { return []; });")).toBe(true);
    });

    it("blocks save when tested but token or compiled script is missing", () => {
      expect(canSaveScript(true, "tested", null, "withReport(async () => {});")).toBe(false);
      expect(canSaveScript(true, "tested", "token", null)).toBe(false);
    });
  });

  describe("renderPreviewCell", () => {
    it("renders em dash for nullish values", () => {
      expect(renderPreviewCell(null)).toBe("—");
      expect(renderPreviewCell(undefined)).toBe("—");
    });

    it("stringifies objects and primitives", () => {
      expect(renderPreviewCell({ a: 1 })).toBe('{"a":1}');
      expect(renderPreviewCell(42)).toBe("42");
    });
  });

  describe("getTestRunDateTagLabel", () => {
    it("returns null when script does not use run date params", () => {
      expect(
        getTestRunDateTagLabel("db.col.find({});", {
          startDate: "2026-06-29T00:00:00.000Z",
          endDate: "2026-06-29T23:59:59.999Z",
        }),
      ).toBeNull();
    });

    it("returns formatted range when script references params", () => {
      expect(
        getTestRunDateTagLabel("ISODate(params.startDate)", {
          startDate: "2026-06-29T00:00:00.000Z",
          endDate: "2026-06-29T23:59:59.999Z",
        }),
      ).toBe("2026-06-29 00:00 – 23:59 UTC");
    });
  });

  describe("buildPreviewTable", () => {
    it("builds ant table columns from sample rows", () => {
      const table = buildPreviewTable([{ username: "a" }]);
      expect(table.columns).toHaveLength(1);
      expect(table.columns[0].title).toBe("username");
      expect(table.rows).toHaveLength(1);
    });
  });

  describe("normalizeTestRunSample", () => {
    it("maps object rows to table columns from object keys", () => {
      const result = normalizeTestRunSample([{ username: "a", tel: "1" }]);
      expect(result.columns).toEqual(["username", "tel"]);
      expect(result.rows[0].username).toBe("a");
    });

    it("falls back to a value column for primitive rows", () => {
      const result = normalizeTestRunSample([42 as unknown as Record<string, unknown>]);
      expect(result.columns).toEqual(["value"]);
      expect(result.rows[0].value).toBe(42);
    });

    it("returns no columns for empty object rows", () => {
      const result = normalizeTestRunSample([{}]);
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });
  });
});
