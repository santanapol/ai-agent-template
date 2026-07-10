import type React from "react";

import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePermission } from "../hooks/usePermission";
import { ZERO_HQ_BRANCH_ID } from "../lib/branchOptions";
import * as staffApi from "../lib/staffApiClient";
import { useAuth } from "../contexts/AuthContext";
import { renderWithProviders } from "../test/renderWithProviders";
import type { StaffProfile } from "../types/staff";
import StaffManagement from "./StaffManagement";

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}));

// Mock dependencies
vi.mock("../hooks/usePermission");
vi.mock("../lib/staffApiClient");
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: { id: "u1", branch_id: "branch-1" } })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

// Mock window.matchMedia for Ant Design UI components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockProfile: StaffProfile = {
  id: "1",
  user_id: "user-1",
  ou_id: "ou-1",
  branch_id: "branch-1",
  status: "active",
  code: "EMP-001",
  firstname: "John",
  lastname: "Doe",
  email: "john@example.com",
  tel: "1234567890",
  user: { username: "jdoe", role: "staff" },
};

describe("StaffManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(staffApi.listProfiles).mockResolvedValue({
      success: true,
      code: "OK",
      message: null,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      requestId: "123",
    });
  });

  test("renders Create staff and Edit buttons when permissions are granted", async () => {
    vi.mocked(usePermission).mockImplementation((permission) => {
      if (permission === "profiles:create") return true;
      if (permission === "profiles:edit") return true;
      return false;
    });

    vi.mocked(staffApi.listProfiles).mockResolvedValue({
      success: true,
      code: "OK",
      message: null,
      data: [mockProfile],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      requestId: "123",
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create staff/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit profile/i })).toBeInTheDocument();
    });
  });

  test("hides Create staff button when profiles:create is missing", async () => {
    vi.mocked(usePermission).mockImplementation((permission) => {
      if (permission === "profiles:create") return false;
      return true;
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Create staff/i })).not.toBeInTheDocument();
    });
  });

  test("shows System Role in create drawer when roles:assign is granted", async () => {
    vi.mocked(usePermission).mockImplementation((permission) => {
      if (permission === "profiles:create") return true;
      if (permission === "roles:assign") return true;
      return false;
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create staff/i })).toBeInTheDocument();
    });

    screen.getByRole("button", { name: /Create staff/i }).click();

    await waitFor(() => {
      expect(screen.getByText("System Role")).toBeInTheDocument();
    });
  });

  test("hides Edit profile button when profiles:edit is missing", async () => {
    vi.mocked(usePermission).mockImplementation((permission) => {
      if (permission === "profiles:edit") return false;
      return true;
    });

    vi.mocked(staffApi.listProfiles).mockResolvedValue({
      success: true,
      code: "OK",
      message: null,
      data: [mockProfile],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      requestId: "123",
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Edit profile/i })).not.toBeInTheDocument();
  });

  test("renders view profile button even when permissions are missing", async () => {
    vi.mocked(usePermission).mockReturnValue(false);
    vi.mocked(staffApi.listProfiles).mockResolvedValue({
      success: true,
      code: "OK",
      message: null,
      data: [mockProfile],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      requestId: "123",
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /View profile/i })).toBeInTheDocument();
    });
  });

  test("shows empty state when filtered search returns no profiles", async () => {
    vi.mocked(usePermission).mockReturnValue(true);
    vi.mocked(staffApi.listProfiles).mockResolvedValue({
      success: true,
      code: "OK",
      message: null,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      requestId: "123",
    });

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByText("No data found")).toBeInTheDocument();
    });
  });

  test("shows Zero HQ branch guidance when staff list is empty on Zero HQ", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", branch_id: ZERO_HQ_BRANCH_ID },
    } as never);

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(screen.getByText(/No staff profiles at Zero HQ/i)).toBeInTheDocument();
      expect(screen.getByText(/branch switcher/i)).toBeInTheDocument();
    });
  });

  test("shows error toast when profile fetch fails", async () => {
    vi.mocked(staffApi.listProfiles).mockRejectedValue(new Error("network"));

    renderWithProviders(<StaffManagement />);

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalled();
    });
  });

  test("aborts in-flight list and reloads when branch changes (FE-REV-003)", async () => {
    vi.mocked(usePermission).mockReturnValue(true);

    let resolveFirst!: (value: Awaited<ReturnType<typeof staffApi.listProfiles>>) => void;
    const first = new Promise<Awaited<ReturnType<typeof staffApi.listProfiles>>>((resolve) => {
      resolveFirst = resolve;
    });
    const signals: AbortSignal[] = [];
    vi.mocked(staffApi.listProfiles)
      .mockImplementationOnce((_params, signal) => {
        if (signal) signals.push(signal);
        return first;
      })
      .mockResolvedValue({
        success: true,
        code: "OK",
        message: null,
        data: [mockProfile],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        requestId: "2",
      });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", branch_id: "branch-1" },
    } as never);

    const { rerender } = renderWithProviders(<StaffManagement />);
    await waitFor(() => {
      expect(staffApi.listProfiles).toHaveBeenCalledTimes(1);
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", branch_id: "branch-2" },
    } as never);
    rerender(<StaffManagement />);

    await waitFor(() => {
      expect(staffApi.listProfiles).toHaveBeenCalledTimes(2);
    });
    expect(signals[0]?.aborted).toBe(true);

    resolveFirst({
      success: true,
      code: "OK",
      message: null,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      requestId: "1",
    });

    await waitFor(() => {
      expect(screen.getByText("EMP-001")).toBeInTheDocument();
    });
  });
});
