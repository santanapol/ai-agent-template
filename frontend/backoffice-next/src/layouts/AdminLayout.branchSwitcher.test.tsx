import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContextValue } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import * as authApi from "../lib/authApiClient";
import { clearBranchCatalogCacheForTests } from "../lib/branchCatalogCache";
import {
  clearCachedInvoiceAgentBranches,
  getCachedInvoiceAgentBranches,
  ZERO_HQ_BRANCH_ID,
} from "../lib/branchOptions";
import { renderWithProviders } from "../test/renderWithProviders";
import type { DecodedUser } from "../types/auth";
import AdminLayout from "./AdminLayout";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
}));

vi.mock("../lib/staffApiClient", () => ({
  getProfileByUserId: vi.fn().mockRejectedValue(new Error("skip")),
}));

vi.mock("../lib/authApiClient", () => ({
  getMyBranch: vi.fn(),
  listMyBranches: vi.fn(),
}));

const messageError = vi.fn();
const messageSuccess = vi.fn();

vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => ({
    message: {
      error: messageError,
      success: messageSuccess,
      warning: vi.fn(),
      info: vi.fn(),
    },
    modal: {},
    notification: {},
  }),
}));

const homeBranch = {
  branch_id: "b-home",
  branch_name: "Home Branch",
  branch_code: "H01",
  active: true,
};

const branches = [
  homeBranch,
  { branch_id: "b-target", branch_name: "Target Branch", branch_code: "T01", active: true },
  { branch_id: "b-off", branch_name: "Closed Branch", branch_code: "X01", active: false },
];

function branchSwitcherTrigger() {
  return screen.getByRole("button", { name: "Select active branch" });
}

function mockAuth(user: DecodedUser, extra: Partial<AuthContextValue> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    permissions: [],
    menus: [{ key: "dashboard", label: "Dashboard", type: "action", parent_key: null, sort_order: 0 }],
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    lastBranchSwitchAt: null,
    login: vi.fn(),
    logout: vi.fn(),
    switchBranch: vi.fn().mockResolvedValue(undefined),
    ...extra,
  } as AuthContextValue);
}

describe("AdminLayout branch switcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBranchCatalogCacheForTests();
    clearCachedInvoiceAgentBranches();
    messageError.mockReset();
    messageSuccess.mockReset();
    vi.mocked(authApi.listMyBranches).mockResolvedValue(branches);
    vi.mocked(authApi.getMyBranch).mockResolvedValue(homeBranch);
  });

  it("does not write limit:20 switcher results into invoice agent cache (FE-REV-001)", async () => {
    mockAuth({
      sub: "user-1",
      role: "platform_admin",
      ou_id: "ou-1",
      branch_id: "b-home",
      home_branch_id: "b-home",
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(authApi.listMyBranches).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    expect(getCachedInvoiceAgentBranches("ou-1")).toBeNull();
  });

  it("shows branch Select for platform_admin and calls switchBranch on change", async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: "user-1",
        role: "platform_admin",
        ou_id: "ou-1",
        branch_id: "b-home",
        home_branch_id: "b-home",
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await user.click(branchSwitcherTrigger());
    await user.click(await screen.findByText("T01 - Target Branch"));

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith("b-target");
      expect(messageSuccess).toHaveBeenCalledWith("Switched to T01 - Target Branch");
    });
  });

  it("shows branch Select for support_admin and calls switchBranch on change", async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: "user-support",
        role: "support_admin",
        ou_id: "ou-1",
        branch_id: "b-home",
        home_branch_id: "b-home",
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await user.click(branchSwitcherTrigger());
    await user.click(await screen.findByText("T01 - Target Branch"));

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith("b-target");
    });
  });

  it("shows clear control when active branch differs from home", async () => {
    mockAuth({
      sub: "user-home-hint",
      role: "platform_admin",
      ou_id: "ou-1",
      branch_id: "b-target",
      home_branch_id: "b-home",
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    const user = userEvent.setup();
    await user.click(await waitFor(() => branchSwitcherTrigger()));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Reset to home branch" })).toBeInTheDocument();
    });
  });

  it("clearing branch select switches back to home branch", async () => {
    const switchBranch = vi.fn().mockResolvedValue(undefined);
    mockAuth(
      {
        sub: "user-reset-home",
        role: "platform_admin",
        ou_id: "ou-1",
        branch_id: "b-target",
        home_branch_id: "b-home",
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await user.click(await waitFor(() => branchSwitcherTrigger()));
    const resetItem = await screen.findByRole("menuitem", { name: "Reset to home branch" });
    await user.click(resetItem);

    await waitFor(() => {
      expect(switchBranch).toHaveBeenCalledWith("b-home");
      expect(messageSuccess).toHaveBeenCalledWith("Switched to H01 - Home Branch");
    });
  });

  it("shows read-only branch Tag for branch_admin (no switcher)", async () => {
    mockAuth({
      sub: "user-2",
      role: "branch_admin",
      ou_id: "ou-1",
      branch_id: "b-home",
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(screen.getByText("H01 - Home Branch")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Select active branch" })).not.toBeInTheDocument();
    expect(authApi.listMyBranches).not.toHaveBeenCalled();
    expect(authApi.getMyBranch).toHaveBeenCalled();
  });

  it("lists inactive branches with (Inactive) label but disabled", async () => {
    mockAuth({
      sub: "user-3",
      role: "support",
      ou_id: "ou-1",
      branch_id: "b-home",
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await user.click(branchSwitcherTrigger());
    const inactive = await screen.findByText("X01 - Closed Branch (Inactive)");
    expect(inactive.closest("[data-disabled]") ?? inactive.closest('[aria-disabled="true"]')).toBeTruthy();
  });

  it("reverts optimistic selection when switchBranch fails", async () => {
    const switchBranch = vi.fn().mockRejectedValue(new Error("switch failed"));
    mockAuth(
      {
        sub: "user-optimistic",
        role: "platform_admin",
        ou_id: "ou-1",
        branch_id: "b-home",
        home_branch_id: "b-home",
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await user.click(branchSwitcherTrigger());
    await user.click(await screen.findByText("T01 - Target Branch"));

    await waitFor(() => {
      expect(messageError).toHaveBeenCalled();
      expect(branchSwitcherTrigger()).not.toHaveTextContent("T01 - Target Branch");
    });
  });

  it("shows read-only Zero HQ when only one branch is available", async () => {
    vi.mocked(authApi.listMyBranches).mockResolvedValue([]);
    vi.mocked(authApi.getMyBranch).mockResolvedValue({
      branch_id: ZERO_HQ_BRANCH_ID,
      branch_name: "Zero HQ",
      branch_code: "ZERO",
      active: true,
    });

    mockAuth({
      sub: "user-zero-hq",
      role: "platform_admin",
      ou_id: "ou-1",
      branch_id: ZERO_HQ_BRANCH_ID,
      home_branch_id: ZERO_HQ_BRANCH_ID,
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(screen.getByText("ZERO - Zero HQ")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Select active branch" })).not.toBeInTheDocument();
  });

  it("shows branch Select when multiple branches are available", async () => {
    vi.mocked(authApi.getMyBranch).mockResolvedValue({
      branch_id: ZERO_HQ_BRANCH_ID,
      branch_name: "Zero HQ",
      branch_code: "ZERO",
      active: true,
    });

    mockAuth({
      sub: "user-zero-hq-multi",
      role: "platform_admin",
      ou_id: "ou-1",
      branch_id: ZERO_HQ_BRANCH_ID,
      home_branch_id: ZERO_HQ_BRANCH_ID,
      token_gen: 0,
      exp: 9999999999,
      iat: 0,
    });

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toHaveTextContent("ZERO - Zero HQ");
    });
  });

  it("shows error when switchBranch fails", async () => {
    const switchBranch = vi.fn().mockRejectedValue(new Error("switch failed"));
    mockAuth(
      {
        sub: "user-4",
        role: "platform_admin",
        ou_id: "ou-1",
        branch_id: "b-home",
        home_branch_id: "b-home",
        token_gen: 0,
        exp: 9999999999,
        iat: 0,
      },
      { switchBranch },
    );

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(branchSwitcherTrigger()).toBeInTheDocument();
    });

    await user.click(branchSwitcherTrigger());
    await user.click(await screen.findByText("T01 - Target Branch"));

    await waitFor(() => {
      expect(messageError).toHaveBeenCalled();
    });
  });
});
