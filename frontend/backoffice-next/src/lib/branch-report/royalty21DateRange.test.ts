import dayjs from "dayjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  currentMonthRegRange,
  formatRegDateParam,
  getRoyalty21DefaultSearchValues,
  isRegDateRangeValid,
  isRegDateRangeWithinMaxDays,
  MAX_REG_DATE_RANGE_DAYS,
  regDateRangeInclusiveDays,
  toRoyalty21QueryParams,
} from "./royalty21DateRange";

describe("royalty21DateRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("currentMonthRegRange returns local month boundaries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00"));

    const range = currentMonthRegRange();
    expect(range.regDateFrom.format("YYYY-MM-DD")).toBe("2024-06-01");
    expect(range.regDateTo.format("YYYY-MM-DD")).toBe("2024-06-30");
  });

  it("formatRegDateParam serializes as YYYY-MM-DD", () => {
    expect(formatRegDateParam(dayjs("2024-06-15"))).toBe("2024-06-15");
  });

  it("getRoyalty21DefaultSearchValues includes affiliate default channel and range", () => {
    const defaults = getRoyalty21DefaultSearchValues();
    expect(defaults.channelType).toBe("affiliate_link");
    expect(defaults.regDateRange).toHaveLength(2);
    expect(defaults.regDateRange[0].isValid()).toBe(true);
    expect(defaults.regDateRange[1].isValid()).toBe(true);
  });

  it("isRegDateRangeValid rejects inverted range", () => {
    expect(isRegDateRangeValid(dayjs("2024-06-01"), dayjs("2024-05-01"))).toBe(false);
    expect(isRegDateRangeValid(dayjs("2024-06-01"), dayjs("2024-06-01"))).toBe(true);
  });

  it("isRegDateRangeWithinMaxDays allows inclusive 366-day span", () => {
    const from = dayjs("2024-01-01");
    const to = from.add(MAX_REG_DATE_RANGE_DAYS - 1, "day");
    expect(regDateRangeInclusiveDays(from, to)).toBe(MAX_REG_DATE_RANGE_DAYS);
    expect(isRegDateRangeWithinMaxDays(from, to)).toBe(true);
    expect(isRegDateRangeWithinMaxDays(from, to.add(1, "day"))).toBe(false);
  });

  it("toRoyalty21QueryParams maps referralUsername for member_referral and omits inviteLinkId", () => {
    expect(
      toRoyalty21QueryParams({
        channelType: "member_referral",
        inviteLinkId: "ignored",
        referralUsername: "REFERRER01",
        regDateRange: [dayjs("2024-06-01"), dayjs("2024-06-30")],
        page: 1,
        pageSize: 50,
      }),
    ).toEqual({
      channelType: "member_referral",
      inviteLinkId: undefined,
      referralUsername: "REFERRER01",
      regDateFrom: "2024-06-01",
      regDateTo: "2024-06-30",
      page: 1,
      pageSize: 50,
    });
  });
});
