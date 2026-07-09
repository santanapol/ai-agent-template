import { useRef } from "react";

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

import { renderWithProviders } from "../../test/renderWithProviders";
import type { AdminMenuNode } from "../../types/permissionAdmin";
import MenuCatalogTab from "./MenuCatalogTab";

const sampleMenus: AdminMenuNode[] = [
  {
    key: "settings",
    label: "Settings",
    type: "menu",
    parent_key: null,
    sort_order: 90,
    upd_date: "2026-06-10T10:00:00.000Z",
  },
  {
    key: "permissions:manage",
    label: "Permissions",
    type: "action",
    parent_key: "settings",
    sort_order: 10,
    upd_date: "2026-06-10T11:00:00.000Z",
  },
  {
    key: "sit:test",
    label: "SIT Test",
    type: "action",
    parent_key: "settings",
    sort_order: 20,
    upd_date: "2026-06-10T12:00:00.000Z",
  },
];

function renderMenuCatalogTab(overrides: Partial<React.ComponentProps<typeof MenuCatalogTab>> = {}) {
  const reloadMenus = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof MenuCatalogTab> = {
    menus: sampleMenus,
    menusLoading: false,
    menusForbidden: false,
    reloadMenus,
    ...overrides,
  };
  renderWithProviders(<MenuCatalogTab {...props} />);
  return { reloadMenus };
}

function MenuCatalogTabTestHarness() {
  const openCreateRef = useRef<(() => void) | null>(null);
  const reloadMenus = vi.fn().mockResolvedValue(undefined);
  return (
    <>
      <Button type="button" onClick={() => openCreateRef.current?.()}>
        Create menu node
      </Button>
      <MenuCatalogTab
        menus={sampleMenus}
        menusLoading={false}
        menusForbidden={false}
        reloadMenus={reloadMenus}
        onCreateActionReady={(open) => {
          openCreateRef.current = open;
        }}
      />
    </>
  );
}

const listAdminMenus = vi.fn();
const createAdminMenu = vi.fn();
const updateAdminMenu = vi.fn();
const deleteAdminMenu = vi.fn();

vi.mock("../../lib/authApiClient", () => ({
  listAdminMenus: (...args: unknown[]) => listAdminMenus(...args),
  createAdminMenu: (...args: unknown[]) => createAdminMenu(...args),
  updateAdminMenu: (...args: unknown[]) => updateAdminMenu(...args),
  deleteAdminMenu: (...args: unknown[]) => deleteAdminMenu(...args),
}));

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}));

vi.mock("../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

function axios403() {
  const err = new Error("Forbidden") as import("axios").AxiosError;
  err.isAxiosError = true;
  err.response = {
    status: 403,
    statusText: "Forbidden",
    data: { code: "AUTH_FORBIDDEN" },
    headers: {},
    config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
  };
  return err;
}

describe("MenuCatalogTab", () => {
  beforeEach(() => {
    listAdminMenus.mockReset();
    createAdminMenu.mockReset();
    updateAdminMenu.mockReset();
    deleteAdminMenu.mockReset();
    mockFeedback.message.success.mockReset();
    mockFeedback.message.error.mockReset();
    listAdminMenus.mockResolvedValue(sampleMenus);
  });

  it("loads and displays menu tree", async () => {
    renderMenuCatalogTab();
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
    expect(listAdminMenus).not.toHaveBeenCalled();
  });

  it("shows forbidden result when menusForbidden is true", async () => {
    renderMenuCatalogTab({ menusForbidden: true });
    expect(await screen.findByText("403 Forbidden")).toBeInTheDocument();
  });

  it("disables edit and delete for permissions:manage", async () => {
    renderMenuCatalogTab();
    await screen.findByText("Permissions");

    expect(screen.getByRole("button", { name: /edit permissions/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /delete permissions/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /edit sit test/i })).not.toBeDisabled();
  });

  it("opens create modal and calls createAdminMenu on submit", async () => {
    const user = userEvent.setup();
    createAdminMenu.mockResolvedValue({
      key: "new:action",
      label: "New Action",
      type: "action",
      parent_key: "settings",
      sort_order: 30,
      upd_date: "2026-06-10T13:00:00.000Z",
    });

    renderWithProviders(<MenuCatalogTabTestHarness />);
    await screen.findByText("Settings");

    await user.click(screen.getByRole("button", { name: /create menu node/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^key$/i), "new:action");
    await user.type(within(dialog).getByLabelText(/^label$/i), "New Action");
    await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(createAdminMenu).toHaveBeenCalledWith({
        key: "new:action",
        label: "New Action",
        type: "action",
        parent_key: null,
        sort_order: 10,
      });
    });
  });

  it("opens edit modal with read-only key and calls updateAdminMenu on save", async () => {
    const user = userEvent.setup();
    updateAdminMenu.mockResolvedValue({
      ...sampleMenus[2],
      label: "SIT Test Updated",
    });

    renderMenuCatalogTab();
    await screen.findByText("SIT Test");

    await user.click(screen.getByRole("button", { name: /edit sit test/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/^key$/i)).toBeDisabled();

    const labelInput = within(dialog).getByLabelText(/^label$/i);
    await user.clear(labelInput);
    await user.type(labelInput, "SIT Test Updated");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(updateAdminMenu).toHaveBeenCalledWith(
        "sit:test",
        {
          label: "SIT Test Updated",
          parent_key: "settings",
          sort_order: 20,
        },
        "2026-06-10T12:00:00.000Z",
      );
    });
    expect(mockFeedback.message.success).toHaveBeenCalledWith("Menu node updated");
  });

  it("shows API error when create returns AUTH_INVALID_REQUEST", async () => {
    const user = userEvent.setup();
    const err = new Error("Bad Request") as import("axios").AxiosError;
    err.isAxiosError = true;
    err.response = {
      status: 400,
      statusText: "Bad Request",
      data: {
        code: "AUTH_INVALID_REQUEST",
        detail: "Menu validation failed: duplicate key",
      },
      headers: {},
      config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
    };
    createAdminMenu.mockRejectedValue(err);

    renderWithProviders(<MenuCatalogTabTestHarness />);
    await screen.findByText("Settings");
    await user.click(screen.getByRole("button", { name: /create menu node/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^key$/i), "dup:action");
    await user.type(within(dialog).getByLabelText(/^label$/i), "Duplicate");
    await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith("Failed to save menu node");
    });
  });

  it("calls deleteAdminMenu with If-Match upd_date", async () => {
    const user = userEvent.setup();
    deleteAdminMenu.mockResolvedValue(undefined);

    renderMenuCatalogTab();
    await screen.findByText("SIT Test");

    await user.click(screen.getByRole("button", { name: /delete sit test/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /^delete$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteAdminMenu).toHaveBeenCalledWith("sit:test", "2026-06-10T12:00:00.000Z");
    });
  });

  it("shows refresh message when update returns 412 AUTH_PRECONDITION_FAILED (SC-5)", async () => {
    const user = userEvent.setup();
    const err = new Error("Precondition Failed") as import("axios").AxiosError;
    err.isAxiosError = true;
    err.response = {
      status: 412,
      statusText: "Precondition Failed",
      data: { code: "AUTH_PRECONDITION_FAILED" },
      headers: {},
      config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
    };
    updateAdminMenu.mockRejectedValue(err);

    renderMenuCatalogTab();
    await screen.findByText("SIT Test");

    await user.click(screen.getByRole("button", { name: /edit sit test/i }));
    const dialog = await screen.findByRole("dialog");
    const labelInput = within(dialog).getByLabelText(/^label$/i);
    await user.clear(labelInput);
    await user.type(labelInput, "Stale edit");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith(
        "This record was modified by another session. Please refresh and try again.",
      );
    });
  });

  it("shows API error when delete returns 409 AUTH_MENU_IN_USE", async () => {
    const user = userEvent.setup();
    const err = new Error("Conflict") as import("axios").AxiosError;
    err.isAxiosError = true;
    err.response = {
      status: 409,
      statusText: "Conflict",
      data: {
        code: "AUTH_MENU_IN_USE",
        detail: "Cannot delete menu node while it has children",
      },
      headers: {},
      config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
    };
    deleteAdminMenu.mockRejectedValue(err);

    renderMenuCatalogTab();
    await screen.findByText("SIT Test");

    await user.click(screen.getByRole("button", { name: /delete sit test/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /^delete$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith("Cannot delete menu node while it has children");
    });
  });
});
