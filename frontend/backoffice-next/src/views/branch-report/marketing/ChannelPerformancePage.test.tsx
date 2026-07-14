import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPersistedChannelPerformanceSearch,
  persistChannelPerformanceSearch,
} from "../../../lib/branch-report/channelPerformanceSearchPersist";
import { INVITE_LINKS_FULL_LIST_LIMIT } from "../../../lib/branch-report/inviteLinksLimits";
import { getRoyalty21DefaultSearchValues, toRoyalty21QueryParams } from "../../../lib/branch-report/royalty21DateRange";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ChannelPerformancePage from "./ChannelPerformancePage";

const mockGetInviteLinks = vi.fn();
const mockGetRoyalty21Times = vi.fn();
const mockGetDepositMatrix = vi.fn();
const mockExportDepositMatrixToCsv = vi.fn();
const mockExportDepositMatrixToXlsx = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../lib/branchReportApiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/branchReportApiClient")>();
  return {
    ...actual,
    getInviteLinks: (...args: unknown[]) => mockGetInviteLinks(...args),
    getRoyalty21Times: (...args: unknown[]) => mockGetRoyalty21Times(...args),
    getDepositMatrix: (...args: unknown[]) => mockGetDepositMatrix(...args),
  };
});

vi.mock("../../../lib/branch-report/depositMatrixExport", () => ({
  exportDepositMatrixToCsv: (...args: unknown[]) => mockExportDepositMatrixToCsv(...args),
  exportDepositMatrixToXlsx: (...args: unknown[]) => mockExportDepositMatrixToXlsx(...args),
}));

// The Member detail tab's Export button uses the default TanStack-table path
// (exportVisibleRowsToCsv/Xlsx), which calls the real triggerBlobDownload -
// jsdom has no URL.createObjectURL, so this must be mocked like elsewhere.
vi.mock("../../../lib/downloadBlob", () => ({
  triggerBlobDownload: vi.fn(),
}));

const emptyMatrix = {
  buckets: [{ key: "0-99", label: "0 - 99", min: 0, max: 99 }],
  rounds: 21,
  counts: [Array(21).fill(0)],
  rowSums: [0],
  percents: [Array(21).fill(0)],
  percentRowSums: [0],
};

vi.mock("../../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

const mockUseAuth = vi.fn();

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("ChannelPerformancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPersistedChannelPerformanceSearch();
    mockGetInviteLinks.mockResolvedValue([]);
    mockGetRoyalty21Times.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 50, total: 0 },
    });
    mockGetDepositMatrix.mockResolvedValue(emptyMatrix);
    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439012", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: null,
    });
  });

  it("renders page title (AC-1)", async () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("Channel Performance")).toBeInTheDocument();
    expect(screen.getByText(/royalty 21 performance marketing/i)).toBeInTheDocument();
  });

  it("renders register date range field with current month defaults", () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("Register from")).toBeInTheDocument();
    expect(screen.getByText("Register to")).toBeInTheDocument();
  });

  it("does not fetch royalty report or invite links on mount (AC-9)", async () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(mockGetInviteLinks).not.toHaveBeenCalled();
    expect(mockGetRoyalty21Times).not.toHaveBeenCalled();
    expect(mockGetDepositMatrix).not.toHaveBeenCalled();
    expect(screen.getByText("Run Search to load report")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /member detail/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /deposit count/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /deposit %/i })).toBeInTheDocument();
  });

  it("shows warning when user has no active branch", () => {
    mockUseAuth.mockReturnValue({
      user: { ou_id: "507f1f77bcf86cd799439011", branch_id: undefined },
      lastBranchSwitchAt: null,
    });

    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("Please select a branch from the top navigation.")).toBeInTheDocument();
    expect(mockGetInviteLinks).not.toHaveBeenCalled();
  });

  it("shows notice when branch switches without a prior search", async () => {
    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });

    renderWithProviders(<ChannelPerformancePage />);

    expect(await screen.findByText("Branch changed")).toBeInTheDocument();
    expect(screen.getByText("Please search again to refresh this report.")).toBeInTheDocument();
  });

  it("loads affiliate links after branch switch even without a prior search", async () => {
    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });

    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: INVITE_LINKS_FULL_LIST_LIMIT,
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it("loads affiliate links when invite dropdown opens", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(document.getElementById("royalty21-invite-link")!);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: INVITE_LINKS_FULL_LIST_LIMIT,
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it("searches affiliate links via API when typing in the dropdown", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(document.getElementById("royalty21-invite-link")!);
    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: INVITE_LINKS_FULL_LIST_LIMIT,
          signal: expect.any(AbortSignal),
        }),
      );
    });

    const search = await screen.findByRole("searchbox", { name: /select affiliate link search/i });
    await user.type(search, "3000");

    await waitFor(
      () => {
        expect(mockGetInviteLinks).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "3000",
            limit: 100,
            signal: expect.any(AbortSignal),
          }),
        );
      },
      { timeout: 2000 },
    );
  });

  it("loads affiliate links after branch switch when prior search used affiliate channel", async () => {
    const defaults = getRoyalty21DefaultSearchValues();
    const values = {
      ...defaults,
      channelType: "affiliate_link" as const,
      inviteLinkId: "link-zero-hq",
    };
    const params = toRoyalty21QueryParams({ ...values, page: 1, pageSize: 50 });
    persistChannelPerformanceSearch(values, params);

    mockGetInviteLinks.mockResolvedValue([{ id: "link-7w", inviteCode: "7W01", username: "agent7w" }]);

    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });

    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: INVITE_LINKS_FULL_LIST_LIMIT,
          signal: expect.any(AbortSignal),
        }),
      );
    });
    expect(mockGetRoyalty21Times).not.toHaveBeenCalled();
    expect(await screen.findByText("Branch changed")).toBeInTheDocument();
    expect(document.getElementById("royalty21-invite-link")).toHaveTextContent(/select affiliate link/i);
  });

  it("auto-refetches direct channel report after branch switch when a prior search exists", async () => {
    const defaults = getRoyalty21DefaultSearchValues();
    const values = { ...defaults, channelType: "direct" as const };
    const params = toRoyalty21QueryParams({ ...values, page: 1, pageSize: 50 });
    persistChannelPerformanceSearch(values, params);

    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });

    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });
    expect(mockGetRoyalty21Times).toHaveBeenCalledWith(
      expect.objectContaining({ channelType: "direct", page: 1 }),
      expect.any(AbortSignal),
    );
    expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Branch changed")).not.toBeInTheDocument();
  });

  it("auto-refetches member_referral report after branch switch when username is persisted", async () => {
    const defaults = getRoyalty21DefaultSearchValues();
    const values = {
      ...defaults,
      channelType: "member_referral" as const,
      referralUsername: "REFERRER01",
    };
    const params = toRoyalty21QueryParams({ ...values, page: 1, pageSize: 50 });
    persistChannelPerformanceSearch(values, params);

    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });

    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });
    expect(mockGetRoyalty21Times).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        page: 1,
      }),
      expect.any(AbortSignal),
    );
    expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Branch changed")).not.toBeInTheDocument();
  });

  it("fetches royalty report when search is submitted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });
    expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
  });

  it("refetches with new pageSize when Rows per page changes after search", async () => {
    mockGetRoyalty21Times
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 50, total: 100 },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 100 },
      });

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });
    expect(mockGetRoyalty21Times).toHaveBeenLastCalledWith(
      expect.objectContaining({ channelType: "direct", pageSize: 50 }),
      expect.any(AbortSignal),
    );

    await user.click(screen.getByRole("combobox", { name: /rows per page/i }));
    await user.click(await screen.findByRole("option", { name: /^20$/i }));

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(2);
    });
    expect(mockGetRoyalty21Times).toHaveBeenLastCalledWith(
      expect.objectContaining({ channelType: "direct", page: 1, pageSize: 20 }),
      expect.any(AbortSignal),
    );
    expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
  });

  it("keeps member rows when deposit matrix fails after search", async () => {
    mockGetRoyalty21Times.mockResolvedValue({
      data: [
        {
          username: "u1",
          register: "01/06/2024",
          billin: 100,
          withdraw: 0,
          promotion: 0,
          revenue: 100,
          deposits: Array(21).fill(0),
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1 },
    });
    mockGetDepositMatrix.mockRejectedValue(new Error("matrix down"));

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith(expect.stringMatching(/deposit matrix/i));
    });
    expect(await screen.findByText("u1")).toBeInTheDocument();
  });

  it("shows deposit matrix after search when switching to Deposit count tab", async () => {
    mockGetDepositMatrix.mockResolvedValue({
      ...emptyMatrix,
      counts: [[2, ...Array(20).fill(0)]],
      rowSums: [2],
    });

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    expect(await screen.findByRole("columnheader", { name: "Rank" })).toBeInTheDocument();
    expect(screen.getByText("0 - 99")).toBeInTheDocument();
  });

  it("clears matrix state when Clear is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => {
      expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    expect(await screen.findByRole("columnheader", { name: "Rank" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^clear$/i }));
    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    expect(screen.getByText("Run Search to load report")).toBeInTheDocument();
  });

  it("shows error toast when royalty fetch fails after search", async () => {
    mockGetRoyalty21Times.mockRejectedValue(new Error("network"));

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
  });

  it("keeps deposit matrix tabs working when the member report fails after search", async () => {
    mockGetRoyalty21Times.mockRejectedValue(new Error("network"));
    mockGetDepositMatrix.mockResolvedValue({
      ...emptyMatrix,
      counts: [[2, ...Array(20).fill(0)]],
      rowSums: [2],
    });

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
    expect(screen.getByText("No members match these filters")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    expect(await screen.findByRole("columnheader", { name: "Rank" })).toBeInTheDocument();
    expect(screen.getByText("0 - 99")).toBeInTheDocument();
  });

  it("shows deposit percent tab data after search when switching to Deposit % tab", async () => {
    mockGetDepositMatrix.mockResolvedValue({
      ...emptyMatrix,
      counts: [[2, ...Array(20).fill(0)]],
      rowSums: [2],
      percents: [[100, ...Array(20).fill(0)]],
      percentRowSums: [100],
    });

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("tab", { name: /deposit %/i }));
    expect(await screen.findByRole("columnheader", { name: "Rank" })).toBeInTheDocument();
    expect(screen.getAllByText("100.00%").length).toBeGreaterThan(0);
  });

  it("keeps Search disabled until both the member report and deposit matrix requests settle", async () => {
    let resolveRoyalty: (value: unknown) => void = () => {
      /* reassigned below before use */
    };
    let resolveMatrix: (value: unknown) => void = () => {
      /* reassigned below before use */
    };
    mockGetRoyalty21Times.mockReturnValue(
      new Promise((resolve) => {
        resolveRoyalty = resolve;
      }),
    );
    mockGetDepositMatrix.mockReturnValue(
      new Promise((resolve) => {
        resolveMatrix = resolve;
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(screen.getByRole("button", { name: /^search$/i })).toBeDisabled();

    resolveRoyalty({ data: [], pagination: { page: 1, pageSize: 50, total: 0 } });
    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveResolvedTimes(1);
    });
    // Member report settled, but the matrix request is still pending — Search must stay disabled.
    expect(screen.getByRole("button", { name: /^search$/i })).toBeDisabled();

    resolveMatrix(emptyMatrix);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^search$/i })).not.toBeDisabled();
    });
  });

  it("aborts an in-flight search's list and matrix requests when the branch switches mid-request", async () => {
    let royaltySignal: AbortSignal | undefined;
    let matrixSignal: AbortSignal | undefined;
    mockGetRoyalty21Times.mockImplementation((_params: unknown, signal: AbortSignal) => {
      royaltySignal = signal;
      return new Promise(() => {
        /* never resolves within this test */
      });
    });
    mockGetDepositMatrix.mockImplementation((_params: unknown, signal: AbortSignal) => {
      matrixSignal = signal;
      return new Promise(() => {
        /* never resolves within this test */
      });
    });

    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(royaltySignal).toBeInstanceOf(AbortSignal);
      expect(matrixSignal).toBeInstanceOf(AbortSignal);
    });
    const firstRoyaltySignal = royaltySignal;
    const firstMatrixSignal = matrixSignal;
    expect(firstRoyaltySignal!.aborted).toBe(false);
    expect(firstMatrixSignal!.aborted).toBe(false);

    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });
    rerender(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(firstRoyaltySignal!.aborted).toBe(true);
      expect(firstMatrixSignal!.aborted).toBe(true);
    });
  });

  it("disables Export before a search and re-enables it once results exist for the active tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByRole("button", { name: /export visible rows/i })).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    });
    // Member detail tab has no rows for this search -> still disabled.
    expect(screen.getByRole("button", { name: /export visible rows/i })).toBeDisabled();

    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    // Deposit count tab has a resolved matrix -> enabled.
    expect(screen.getByRole("button", { name: /export visible rows/i })).not.toBeDisabled();
  });

  it("exports the deposit-count matrix via the default TanStack table path when on Member detail", async () => {
    const user = userEvent.setup();
    mockGetRoyalty21Times.mockResolvedValue({
      data: [
        {
          username: "u1",
          register: "01/06/2024",
          billin: 100,
          withdraw: 0,
          promotion: 0,
          revenue: 100,
          deposits: Array(21).fill(0),
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1 },
    });
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await screen.findByText("u1");

    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export CSV"));

    expect(mockExportDepositMatrixToCsv).not.toHaveBeenCalled();
    expect(mockExportDepositMatrixToXlsx).not.toHaveBeenCalled();
  });

  it("exports the deposit matrix as CSV/Excel with the tab's mode and file name", async () => {
    const user = userEvent.setup();
    mockGetDepositMatrix.mockResolvedValue({
      ...emptyMatrix,
      counts: [[2, ...Array(20).fill(0)]],
      rowSums: [2],
      percents: [[100, ...Array(20).fill(0)]],
      percentRowSums: [100],
    });
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => {
      expect(mockGetDepositMatrix).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("tab", { name: /deposit count/i }));
    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export Excel"));

    expect(mockExportDepositMatrixToXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ counts: [[2, ...Array(20).fill(0)]] }),
      "count",
      "channel-performance-deposit-count",
    );

    await user.click(screen.getByRole("tab", { name: /deposit %/i }));
    await user.click(screen.getByRole("button", { name: /export visible rows/i }));
    await user.click(await screen.findByText("Export CSV"));

    expect(mockExportDepositMatrixToCsv).toHaveBeenCalledWith(
      expect.objectContaining({ percents: [[100, ...Array(20).fill(0)]] }),
      "percent",
      "channel-performance-deposit-percent",
    );
  });

  it("persists a rows-per-page change so a later branch switch restores the new page size, not the stale one", async () => {
    mockGetRoyalty21Times
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 50, total: 100 },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 100 },
      });

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("combobox", { name: /^channel$/i }));
    await user.click(await screen.findByRole("option", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });

    // Change rows-per-page after the initial search - this is the only place
    // that previously never re-persisted the search (only the Search button did).
    await user.click(screen.getByRole("combobox", { name: /rows per page/i }));
    await user.click(await screen.findByRole("option", { name: /^20$/i }));
    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(2);
    });

    mockGetRoyalty21Times.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 100 },
    });
    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
      lastBranchSwitchAt: Date.now(),
    });
    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(3);
    });
    expect(mockGetRoyalty21Times).toHaveBeenLastCalledWith(
      expect.objectContaining({ channelType: "direct", pageSize: 20 }),
      expect.any(AbortSignal),
    );
  });
});
