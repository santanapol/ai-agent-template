import { describe, expect, it } from "vitest";

import { buildInvoiceListQuery, buildInvoiceListSearchParams, parseInvoiceListSearchParams } from "./utils";

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
