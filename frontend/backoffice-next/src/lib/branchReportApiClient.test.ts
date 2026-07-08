import { beforeEach, describe, expect, it, vi } from "vitest";

import { BranchReportApiError, getInviteLinks, getRoyalty21Times } from "./branchReportApiClient";

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
});
