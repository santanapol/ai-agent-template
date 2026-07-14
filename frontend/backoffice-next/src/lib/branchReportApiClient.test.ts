import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BranchReportApiError,
  getDepositMatrix,
  getInviteLinks,
  getRoyalty21Times,
} from "./branchReportApiClient";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("./baseApiClient", () => ({
  baseClient: {
    get: mockGet,
  },
}));

describe("branchReportApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getInviteLinks calls GET /api/v1/branch-report/invite-links", async () => {
    const links = [{ id: "1", inviteCode: "ABC", username: "user1", description: "desc" }];
    mockGet.mockResolvedValueOnce({
      data: { success: true, code: "SUCCESS", message: "OK", data: links },
    });

    const result = await getInviteLinks();
    expect(mockGet).toHaveBeenCalledWith("/api/v1/branch-report/invite-links", {
      params: { q: undefined, limit: undefined },
      signal: undefined,
    });
    expect(result).toEqual(links);
  });

  it("getInviteLinks throws BranchReportApiError when success is false", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: false,
        code: "INVALID_PARAM",
        message: "Invalid channel",
        data: null,
      },
    });

    await expect(getInviteLinks()).rejects.toMatchObject({
      name: "BranchReportApiError",
      code: "INVALID_PARAM",
      message: "Invalid report parameters. Check your filters and try again.",
    });
  });

  it("getRoyalty21Times calls GET with query params and returns data + pagination", async () => {
    const pagination = { page: 1, pageSize: 50, total: 2 };
    const rows = [
      {
        username: "u1",
        register: "01/01/2024",
        billin: 100,
        withdraw: 50,
        promotion: 0,
        revenue: 50,
        deposits: Array(21).fill(0),
      },
    ];
    mockGet.mockResolvedValueOnce({
      data: { success: true, code: "SUCCESS", message: "OK", data: rows, pagination },
    });

    const result = await getRoyalty21Times({
      channelType: "affiliate_link",
      inviteLinkId: "link-1",
      regDateFrom: "2024-06-01",
      regDateTo: "2024-06-30",
      page: 1,
      pageSize: 50,
    });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/branch-report/royalty-21-times", {
      params: {
        channelType: "affiliate_link",
        inviteLinkId: "link-1",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
        page: 1,
        pageSize: 50,
      },
      signal: undefined,
    });
    expect(result).toEqual({ data: rows, pagination });
  });

  it("getRoyalty21Times throws when pagination is missing", async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, code: "SUCCESS", message: "OK", data: [] },
    });

    await expect(
      getRoyalty21Times({
        channelType: "direct",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      }),
    ).rejects.toBeInstanceOf(BranchReportApiError);
  });

  it("getDepositMatrix calls GET deposit-matrix and unwraps data without pagination", async () => {
    const matrix = {
      buckets: [{ key: "0-99", label: "0 - 99", min: 0, max: 99 }],
      rounds: 21 as const,
      counts: [Array(21).fill(0)],
      rowSums: [0],
      percents: [Array(21).fill(0)],
      percentRowSums: [0],
    };
    const signal = new AbortController().signal;
    mockGet.mockResolvedValueOnce({
      data: { success: true, code: "SUCCESS", message: null, data: matrix },
    });

    const result = await getDepositMatrix(
      {
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      },
      signal,
    );

    expect(mockGet).toHaveBeenCalledWith("/api/v1/branch-report/royalty-21-times/deposit-matrix", {
      params: {
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      },
      signal,
    });
    expect(result).toEqual(matrix);
  });

  it("getDepositMatrix throws BranchReportApiError when success is false", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: false,
        code: "INVALID_PARAM",
        message: "bad",
        data: null,
      },
    });

    await expect(
      getDepositMatrix({
        channelType: "direct",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      }),
    ).rejects.toMatchObject({
      name: "BranchReportApiError",
      code: "INVALID_PARAM",
    });
  });
});
