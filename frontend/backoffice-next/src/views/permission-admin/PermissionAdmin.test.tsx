import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import PermissionAdmin from "./PermissionAdmin";

const listAdminMenus = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../lib/authApiClient", () => ({
  listAdminMenus: (...args: unknown[]) => listAdminMenus(...args),
  listRolePermissions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

describe("PermissionAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminMenus.mockResolvedValue([]);
  });

  it("renders Menu catalog and Role permissions tabs", () => {
    renderWithProviders(<PermissionAdmin />);
    expect(screen.getByRole("tab", { name: /menu catalog/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /role permissions/i })).toBeInTheDocument();
  });

  it("shows menu catalog panel by default", () => {
    renderWithProviders(<PermissionAdmin />);
    expect(screen.getByTestId("menu-catalog-tab")).toBeInTheDocument();
  });

  it("switches to role permissions tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionAdmin />);
    await user.click(screen.getByRole("tab", { name: /role permissions/i }));
    expect(screen.getByTestId("role-permissions-tab")).toBeInTheDocument();
  });

  it("does not refetch menus when switching tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionAdmin />);

    await screen.findByTestId("menu-catalog-tab");
    expect(listAdminMenus).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("tab", { name: /role permissions/i }));
    expect(screen.getByTestId("role-permissions-tab")).toBeInTheDocument();
    expect(listAdminMenus).toHaveBeenCalledTimes(1);
  });

  it("shows API error toast when menu catalog load fails", async () => {
    listAdminMenus.mockRejectedValue(new Error("network"));

    renderWithProviders(<PermissionAdmin />);

    await screen.findByTestId("menu-catalog-tab");
    expect(mockFeedback.message.error).toHaveBeenCalled();
  });

  it("shows 403 fallback when menu catalog API returns forbidden", async () => {
    const err = new Error("Forbidden") as import("axios").AxiosError;
    err.isAxiosError = true;
    err.response = {
      status: 403,
      statusText: "Forbidden",
      data: {},
      headers: {},
      config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
    };
    listAdminMenus.mockRejectedValue(err);

    renderWithProviders(<PermissionAdmin />);

    expect(await screen.findByText("403 Forbidden")).toBeInTheDocument();
  });
});
