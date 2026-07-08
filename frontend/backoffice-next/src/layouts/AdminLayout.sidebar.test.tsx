import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryRouter, Route, Routes } from "@/navigation/compat";

import type { AuthContextValue } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { renderWithProviders } from "../test/renderWithProviders";
import type { DecodedUser, MenuNode } from "../types/auth";
import AdminLayout from "./AdminLayout";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../lib/staffApiClient", () => ({
  getProfileByUserId: vi.fn().mockRejectedValue(new Error("skip")),
}));

vi.mock("../lib/authApiClient", () => ({
  getMyBranch: vi.fn().mockResolvedValue({
    branch_id: "b1",
    branch_name: "Branch One",
    branch_code: "B1",
    active: true,
  }),
  listMyBranches: vi.fn().mockResolvedValue([]),
}));

const branchAdminUser = { sub: "456", role: "branch_admin", branch_id: "b1" } as DecodedUser;

const menusWithInvoices: MenuNode[] = [
  { key: "dashboard", label: "Dashboard", type: "action", parent_key: null, sort_order: 0 },
  { key: "billing", label: "Billing", type: "menu", parent_key: null, sort_order: 10 },
  { key: "invoices:list", label: "Invoices", type: "action", parent_key: "billing", sort_order: 10 },
];

const menusWithoutInvoices: MenuNode[] = [
  { key: "dashboard", label: "Dashboard", type: "action", parent_key: null, sort_order: 0 },
];

const menusWithBranchReport: MenuNode[] = [
  { key: "dashboard", label: "Dashboard", type: "action", parent_key: null, sort_order: 0 },
  { key: "branch-report", label: "Branch Report", type: "menu", parent_key: null, sort_order: 35 },
  {
    key: "branch-report:marketing:channel-performance:read",
    label: "Channel Performance",
    type: "action",
    parent_key: "branch-report",
    sort_order: 10,
  },
];

function renderLayout(menus: MenuNode[]) {
  vi.mocked(useAuth).mockReturnValue({
    user: branchAdminUser,
    permissions: ["profiles:lookup"],
    menus,
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    lastBranchSwitchAt: null,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    switchBranch: vi.fn(),
  } as AuthContextValue);

  return renderWithProviders(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<div>Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout sidebar (SC-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Invoices under Billing when branch_admin mapping includes invoices:list", async () => {
    const user = userEvent.setup();
    renderLayout(menusWithInvoices);
    expect(screen.getByText("Billing")).toBeInTheDocument();
    await user.click(screen.getByText("Billing"));
    await waitFor(() => {
      expect(screen.getByText("Invoices")).toBeInTheDocument();
    });
  });

  it("hides Invoices after role mapping no longer grants invoices:list (post-refresh menus)", async () => {
    const user = userEvent.setup();
    const { rerender } = renderLayout(menusWithInvoices);
    await user.click(screen.getByText("Billing"));
    await waitFor(() => {
      expect(screen.getByText("Invoices")).toBeInTheDocument();
    });

    vi.mocked(useAuth).mockReturnValue({
      user: branchAdminUser,
      permissions: ["profiles:lookup"],
      menus: menusWithoutInvoices,
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      switchBranch: vi.fn(),
    } as AuthContextValue);

    rerender(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Invoices")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
  });

  it("shows Channel Performance under Branch Report for branch_admin", async () => {
    const user = userEvent.setup();
    renderLayout(menusWithBranchReport);
    expect(screen.getByText("Branch Report")).toBeInTheDocument();
    await user.click(screen.getByText("Branch Report"));
    await waitFor(() => {
      expect(screen.getByText("Channel Performance")).toBeInTheDocument();
    });
    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });

  it("highlights active menu item for current route", async () => {
    renderLayout(menusWithInvoices);

    fireEvent.click(screen.getAllByText("Billing")[0]);
    await waitFor(() => {
      expect(screen.getByText("Invoices")).toBeInTheDocument();
    });
  });
});
