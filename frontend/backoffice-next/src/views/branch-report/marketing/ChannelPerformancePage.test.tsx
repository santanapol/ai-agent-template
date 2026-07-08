import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/renderWithProviders";
import ChannelPerformancePage from "./ChannelPerformancePage";

const mockGetInviteLinks = vi.fn();
const mockGetRoyalty21Times = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../lib/branchReportApiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/branchReportApiClient")>();
  return {
    ...actual,
    getInviteLinks: (...args: unknown[]) => mockGetInviteLinks(...args),
    getRoyalty21Times: (...args: unknown[]) => mockGetRoyalty21Times(...args),
  };
});

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
    mockGetInviteLinks.mockResolvedValue([]);
    mockGetRoyalty21Times.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 50, total: 0 },
    });
    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439012", ou_id: "507f1f77bcf86cd799439011" },
    });
  });

  it("renders page title (AC-1)", async () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("Channel Performance")).toBeInTheDocument();
    expect(screen.getByText(/royalty 21 performance marketing/i)).toBeInTheDocument();
  });

  it("renders register date range field with current month defaults", () => {
    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
  });

  it("does not fetch royalty report on mount (AC-9)", async () => {
    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalled();
    });
    expect(mockGetRoyalty21Times).not.toHaveBeenCalled();
    expect(screen.getByText("Select channel and click Search")).toBeInTheDocument();
  });

  it("shows warning when user has no active branch", () => {
    mockUseAuth.mockReturnValue({
      user: { ou_id: "507f1f77bcf86cd799439011", branch_id: undefined },
    });

    renderWithProviders(<ChannelPerformancePage />);

    expect(screen.getByText("Please select a branch from the top navigation.")).toBeInTheDocument();
    expect(mockGetInviteLinks).not.toHaveBeenCalled();
  });

  it("shows persistent notice after branch switch", async () => {
    const { rerender } = renderWithProviders(<ChannelPerformancePage />);

    mockUseAuth.mockReturnValue({
      user: { branch_id: "507f1f77bcf86cd799439099", ou_id: "507f1f77bcf86cd799439011" },
    });

    rerender(<ChannelPerformancePage />);

    expect(await screen.findByText("Branch changed")).toBeInTheDocument();
    expect(screen.getByText("Please search again to refresh this report.")).toBeInTheDocument();
  });

  it("fetches royalty report when search is submitted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await waitFor(() => {
      expect(mockGetInviteLinks).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockGetRoyalty21Times).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error toast when royalty fetch fails after search", async () => {
    mockGetRoyalty21Times.mockRejectedValue(new Error("network"));

    const user = userEvent.setup();
    renderWithProviders(<ChannelPerformancePage />);

    await user.click(screen.getByRole("button", { name: /^direct$/i }));
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
  });
});
