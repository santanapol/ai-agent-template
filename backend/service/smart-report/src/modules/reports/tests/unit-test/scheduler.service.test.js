import { test, describe } from "node:test";
import assert from "node:assert/strict";
import cron from "node-cron";

import {
  computePreviousDayRange,
  replacePlaceholders,
  scheduleToCron,
} from "../../scheduler.service.js";

describe("scheduler.service (pure helpers)", () => {
  describe("computePreviousDayRange", () => {
    test("computes the previous full day for a given UTC offset (+07:00)", () => {
      const now = new Date("2026-03-02T03:00:00.000Z");
      const { startDate, endDate } = computePreviousDayRange(now, 7 * 60);

      assert.equal(startDate.toISOString(), "2026-02-28T17:00:00.000Z");
      assert.equal(endDate.toISOString(), "2026-03-01T16:59:59.999Z");
    });

    test("defaults to UTC when no offset is given", () => {
      const now = new Date("2026-03-02T10:00:00.000Z");
      const { startDate, endDate } = computePreviousDayRange(now);

      assert.equal(startDate.toISOString(), "2026-03-01T00:00:00.000Z");
      assert.equal(endDate.toISOString(), "2026-03-01T23:59:59.999Z");
    });
  });

  describe("replacePlaceholders", () => {
    test("substitutes {{key}} tokens with the provided params", () => {
      const script =
        'const startDate = ISODate("{{startDate}}");\nconst endDate = ISODate("{{endDate}}");';
      const result = replacePlaceholders(script, {
        startDate: "2026-02-28T17:00:00.000Z",
        endDate: "2026-03-01T16:59:59.999Z",
      });

      assert.equal(
        result,
        'const startDate = ISODate("2026-02-28T17:00:00.000Z");\nconst endDate = ISODate("2026-03-01T16:59:59.999Z");',
      );
    });

    test("leaves unknown placeholders untouched", () => {
      assert.equal(replacePlaceholders("{{unknown}}", {}), "{{unknown}}");
    });
  });

  describe("scheduleToCron", () => {
    test("converts daily/weekly/monthly schedules into cron expressions", () => {
      assert.equal(
        scheduleToCron({ frequency: "daily", hour: 1, minute: 30 }),
        "30 1 * * *",
      );
      assert.equal(
        scheduleToCron({
          frequency: "weekly",
          hour: 6,
          minute: 0,
          dayOfWeek: 1,
        }),
        "0 6 * * 1",
      );
      assert.equal(
        scheduleToCron({
          frequency: "monthly",
          hour: 2,
          minute: 15,
          dayOfMonth: 1,
        }),
        "15 2 1 * *",
      );
    });

    test("produces a cron expression accepted by node-cron", () => {
      const expression = scheduleToCron({
        frequency: "daily",
        hour: 1,
        minute: 0,
      });
      assert.ok(cron.validate(expression));
    });

    test("throws for an unsupported frequency", () => {
      assert.throws(
        () => scheduleToCron({ frequency: "yearly" }),
        /Unsupported schedule frequency/,
      );
    });
  });
});
