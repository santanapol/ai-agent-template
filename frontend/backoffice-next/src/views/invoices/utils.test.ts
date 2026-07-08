import { describe, expect, it } from "vitest";

import { buildInvoiceListQuery } from "./utils";

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
