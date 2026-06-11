import { test, describe } from "node:test";
import assert from "node:assert/strict";
import cron from "node-cron";

import {
  computePreviousDayRange,
  scheduleToCron,
  isLastDayOfMonth,
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
      assert.equal(
        scheduleToCron({
          frequency: "monthly",
          hour: 2,
          minute: 15,
          dayOfMonth: "last",
        }),
        "15 2 28,29,30,31 * *",
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

  describe("isLastDayOfMonth", () => {
    test("Feb 28 is the last day in a non-leap year (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2026-02-28T12:00:00.000Z"), "UTC"),
        true,
      );
    });

    test("Feb 28 is NOT the last day in a leap year (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2028-02-28T12:00:00.000Z"), "UTC"),
        false,
      );
    });

    test("Feb 29 is the last day in a leap year (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2028-02-29T12:00:00.000Z"), "UTC"),
        true,
      );
    });

    test("Apr 30 is the last day of a 30-day month (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2026-04-30T12:00:00.000Z"), "UTC"),
        true,
      );
    });

    test("Apr 29 is NOT the last day of a 30-day month (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2026-04-29T12:00:00.000Z"), "UTC"),
        false,
      );
    });

    test("Jan 31 is the last day of a 31-day month (UTC)", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2026-01-31T12:00:00.000Z"), "UTC"),
        true,
      );
    });

    test("defaults to UTC when no timezone is given", () => {
      assert.equal(
        isLastDayOfMonth(new Date("2026-01-31T12:00:00.000Z")),
        true,
      );
    });

    test("is timezone-aware: last day in Asia/Bangkok but not yet in UTC", () => {
      // 2026-04-29T17:05:00.000Z === 2026-04-30T00:05:00+07:00 (Bangkok)
      const now = new Date("2026-04-29T17:05:00.000Z");

      assert.equal(isLastDayOfMonth(now, "Asia/Bangkok"), true);
      assert.equal(isLastDayOfMonth(now, "UTC"), false);
    });
  });
});
