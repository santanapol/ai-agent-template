import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as staffApi from "../lib/staffApiClient";
import { mockAuthUser, mockPaginatedResponse } from "../test/mockFactories";
import { testNavigation } from "../test/mockNavigation";
import { renderWithRouter } from "../test/renderWithRouter";
import Dashboard from "./Dashboard";

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../lib/staffApiClient");
vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

import { useAuth } from "../contexts/AuthContext";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    vi.mocked(staffApi.getProfileCounts).mockResolvedValue({ total: 5 });
  });

  it("loads stat cards for admin roles", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser("platform_admin"),
      permissions: ["profiles:list"],
    } as ReturnType<typeof useAuth>);

    vi.mocked(staffApi.getProfileCounts)
      .mockResolvedValueOnce({ total: 12 })
      .mockResolvedValueOnce({ total: 3 });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Active Staff")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    expect(staffApi.getProfileCounts).toHaveBeenCalledTimes(2);
  });

  it("shows staff shortcuts when permitted", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser("staff"),
      permissions: ["reports:smart"],
    } as ReturnType<typeof useAuth>);

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /my profile/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /smart reports/i })).toBeInTheDocument();
    });
    expect(staffApi.getProfileCounts).not.toHaveBeenCalled();
  });

  it("shows error toast when stats fetch fails", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser("branch_admin"),
    } as ReturnType<typeof useAuth>);
    vi.mocked(staffApi.getProfileCounts).mockRejectedValue(new Error("network"));

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
  });

  it("navigates to staff management from shortcut", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthUser("platform_admin"),
      permissions: ["profiles:list"],
    } as ReturnType<typeof useAuth>);

    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);

    await user.click(screen.getByRole("button", { name: /staff management/i }));
    expect(testNavigation.push).toHaveBeenCalledWith("/staff", undefined);
  });
});
