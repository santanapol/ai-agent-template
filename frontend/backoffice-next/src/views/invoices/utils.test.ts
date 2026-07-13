import { describe, expect, it } from "vitest";

import {
  buildInvoiceListQuery,
  buildInvoiceListSearchParams,
  formatBillingMonth,
  formatDate,
  formatInvoiceStatusLabel,
  formatMoney,
  formatMoneyWithCurrency,
  isDueDateOverdue,
  parseInvoiceListSearchParams,
} from "./utils";

describe("formatMoney", () => {
  it("formats with two fraction digits", () => {
    expect(formatMoney(12500)).toBe("12,500.00");
  });

  it("returns dash for nullish values", () => {
    expect(formatMoney(null)).toBe("-");
    expect(formatMoney(undefined)).toBe("-");
  });
});

describe("formatMoneyWithCurrency", () => {
  it("prefixes uppercase currency when present", () => {
    expect(formatMoneyWithCurrency(1234, "thb")).toBe("THB 1,234.00");
    expect(formatMoneyWithCurrency(1234, "THB")).toBe("THB 1,234.00");
  });

  it("falls back to formatMoney when currency missing", () => {
    expect(formatMoneyWithCurrency(1234, null)).toBe("1,234.00");
    expect(formatMoneyWithCurrency(1234, undefined)).toBe("1,234.00");
    expect(formatMoneyWithCurrency(1234, "  ")).toBe("1,234.00");
  });

  it("returns dash for nullish amounts", () => {
    expect(formatMoneyWithCurrency(null, "THB")).toBe("-");
  });
});

describe("formatBillingMonth", () => {
  it("formats YYYY-MM as a readable month label", () => {
    expect(formatBillingMonth("2026-07")).toBe("July 2026");
  });

  it("returns dash for empty values and passes through unknown formats", () => {
    expect(formatBillingMonth(null)).toBe("-");
    expect(formatBillingMonth("custom")).toBe("custom");
  });
});

describe("formatInvoiceStatusLabel", () => {
  it("maps known invoice statuses to readable labels", () => {
    expect(formatInvoiceStatusLabel("READY")).toBe("Ready to pay");
    expect(formatInvoiceStatusLabel("PAID")).toBe("Paid");
  });

  it("falls back to the raw status for unknown values", () => {
    expect(formatInvoiceStatusLabel("CUSTOM")).toBe("CUSTOM");
  });
});

describe("formatDate", () => {
  it("formats valid dates as YYYY-MM-DD", () => {
    expect(formatDate("2026-07-24T00:00:00.000Z")).toMatch(/2026-07-2[34]/);
  });

  it("returns dash for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatDate(null)).toBe("-");
  });
});

describe("isDueDateOverdue", () => {
  it("is true when due date is before today and unpaid", () => {
    expect(isDueDateOverdue("2000-01-01", "READY")).toBe(true);
  });

  it("is false for paid or void invoices", () => {
    expect(isDueDateOverdue("2000-01-01", "PAID")).toBe(false);
    expect(isDueDateOverdue("2000-01-01", "VOID")).toBe(false);
  });

  it("is false for future due dates", () => {
    expect(isDueDateOverdue("2099-12-31", "READY")).toBe(false);
  });
});

describe("buildInvoiceListQuery", () => {
  const base = {
    page: 2,
    limit: 10,
    branchId: "branch-1",
    billingMonth: "2026-06",
    status: "READY",
  };

  it("keeps billing_month and pagination when not searching", () => {
    expect(buildInvoiceListQuery(base)).toEqual({
      page: 2,
      limit: 10,
      branch_id: "branch-1",
      billing_month: "2026-06",
      status: "READY",
    });
  });

  it("sends branch_id=all when no branch filter is selected", () => {
    expect(buildInvoiceListQuery({ ...base, branchId: undefined }).branch_id).toBe("all");
  });

  it("sends exact iv_no with normal pagination when searching", () => {
    expect(buildInvoiceListQuery({ ...base, ivNo: "07BB-202606-02" })).toEqual({
      page: 2,
      limit: 10,
      iv_no: "07BB-202606-02",
      branch_id: "branch-1",
      billing_month: "2026-06",
      status: "READY",
    });
  });

  it("omits iv_no for whitespace-only search", () => {
    const result = buildInvoiceListQuery({ ...base, ivNo: "   " });
    expect(result.iv_no).toBeUndefined();
    expect(result.page).toBe(2);
  });
});

describe("buildInvoiceListSearchParams", () => {
  it("serializes default invoice list URL filters", () => {
    const params = buildInvoiceListSearchParams({
      searchText: "",
      billingMonth: "2026-07",
      page: 1,
      pageSize: 10,
    });
    expect(params.toString()).toBe("branch_id=all&billing_month=2026-07");
  });
});

describe("parseInvoiceListSearchParams", () => {
  it("ignores invalid status values", () => {
    const parsed = parseInvoiceListSearchParams(new URLSearchParams("status=NOT_A_STATUS&page=2"));
    expect(parsed.selectedStatus).toBeUndefined();
    expect(parsed.page).toBe(2);
  });

  it("accepts known invoice statuses", () => {
    const parsed = parseInvoiceListSearchParams(new URLSearchParams("status=READY"));
    expect(parsed.selectedStatus).toBe("READY");
  });

  it("defaults page and page size when params are missing or invalid", () => {
    const parsed = parseInvoiceListSearchParams(new URLSearchParams("page=0&page_size=abc"));
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(10);
  });
});
