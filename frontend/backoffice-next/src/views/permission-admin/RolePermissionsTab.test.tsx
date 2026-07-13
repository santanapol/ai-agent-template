import { useState } from "react";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoadingButton } from "../../components/LoadingButton";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { AdminMenuNode, KnownRole } from "../../types/permissionAdmin";
import RolePermissionsTab, { type RoleSaveActions } from "./RolePermissionsTab";

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
    key: "profiles:list",
    label: "Staff list",
    type: "action",
    parent_key: "settings",
    sort_order: 20,
    upd_date: "2026-06-10T12:00:00.000Z",
  },
];

function RolePermissionsHarness({
  overrides = {},
}: {
  overrides?: Partial<React.ComponentProps<typeof RolePermissionsTab>>;
}) {
  const [role, setRole] = useState<KnownRole>("platform_admin");
  const [saveActions, setSaveActions] = useState<RoleSaveActions | null>(null);

  return (
    <>
      <LoadingButton
        loading={saveActions?.saving ?? false}
        disabled={saveActions?.disabled ?? true}
        onClick={() => saveActions?.save()}
      >
        Save
      </LoadingButton>
      <RolePermissionsTab
        menus={sampleMenus}
        menusLoading={false}
        menusForbidden={false}
        {...overrides}
        role={role}
        onRoleCommitted={setRole}
        onSaveActionReady={setSaveActions}
      />
    </>
  );
}

function renderRolePermissionsTab(overrides: Partial<React.ComponentProps<typeof RolePermissionsTab>> = {}) {
  renderWithProviders(<RolePermissionsHarness overrides={overrides} />);
}

const listRolePermissions = vi.fn();
const upsertRolePermission = vi.fn();

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}));

vi.mock("../../lib/authApiClient", () => ({
  listRolePermissions: (...args: unknown[]) => listRolePermissions(...args),
  upsertRolePermission: (...args: unknown[]) => upsertRolePermission(...args),
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

describe("RolePermissionsTab", () => {
  beforeEach(() => {
    listRolePermissions.mockReset();
    upsertRolePermission.mockReset();
    mockFeedback.message.success.mockReset();
    mockFeedback.message.error.mockReset();
    mockFeedback.modal.confirm.mockReset();

    listRolePermissions.mockResolvedValue([
      {
        ou_id: null,
        role: "platform_admin",
        menu_keys: ["permissions:manage", "profiles:*"],
        upd_date: "2026-06-10T10:00:00.000Z",
      },
    ]);
  });

  it("loads role mapping and shows checkbox tree", async () => {
    renderRolePermissionsTab();
    expect(await screen.findByText("Permissions")).toBeInTheDocument();
    expect(screen.getByText("Staff list")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /role:/i })).toBeInTheDocument();
    await waitFor(() => expect(listRolePermissions).toHaveBeenCalledWith({ role: "platform_admin" }));
  });

  it("shows forbidden result when menusForbidden is true", async () => {
    renderRolePermissionsTab({ menusForbidden: true });
    expect(await screen.findByText("403 Forbidden")).toBeInTheDocument();
  });

  it("calls upsertRolePermission on save without If-Match", async () => {
    const user = userEvent.setup();
    upsertRolePermission.mockResolvedValue({
      ou_id: "null",
      role: "platform_admin",
      menu_keys: ["permissions:manage"],
      revoked_sessions: false,
      revoked_users_count: 0,
    });

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    const profilesCheckbox = screen.getByRole("checkbox", { name: /staff list/i });
    await user.click(profilesCheckbox);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await user.click(await screen.findByRole("button", { name: /^save only$/i }));

    await waitFor(() => expect(upsertRolePermission).toHaveBeenCalled());
    expect(upsertRolePermission).toHaveBeenCalledWith(
      "platform_admin",
      expect.objectContaining({
        revoke_sessions: false,
        menu_keys: ["permissions:manage"],
      }),
    );
    expect(mockFeedback.message.success).toHaveBeenCalledWith(expect.stringContaining("refresh their session"));
  });

  it("checks all action children when parent menu checkbox is clicked", async () => {
    const user = userEvent.setup();
    listRolePermissions.mockResolvedValue([
      {
        ou_id: null,
        role: "platform_admin",
        menu_keys: ["permissions:manage"],
        upd_date: "2026-06-10T10:00:00.000Z",
      },
    ]);

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    expect(screen.getByRole("checkbox", { name: /staff list/i })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: /settings/i }));

    expect(screen.getByRole("checkbox", { name: /staff list/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /permissions/i })).toBeChecked();
  });

  it("sends revoke_sessions when Save and revoke sessions is chosen", async () => {
    const user = userEvent.setup();
    upsertRolePermission.mockResolvedValue({
      ou_id: "null",
      role: "platform_admin",
      menu_keys: ["permissions:manage", "profiles:*"],
      revoked_sessions: true,
      revoked_users_count: 3,
    });

    renderRolePermissionsTab();
    await screen.findByText("Permissions");

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await user.click(await screen.findByRole("button", { name: /save and revoke sessions/i }));

    await waitFor(() => {
      expect(upsertRolePermission).toHaveBeenCalledWith("platform_admin", {
        menu_keys: ["permissions:manage", "profiles:list"],
        revoke_sessions: true,
      });
    });
    expect(mockFeedback.message.success).toHaveBeenCalledWith("Revoked 3 active session(s).");
  });

  it("disables permissions:manage checkbox for platform_admin without permissions:*", async () => {
    listRolePermissions.mockResolvedValue([
      {
        ou_id: null,
        role: "platform_admin",
        menu_keys: ["permissions:manage", "profiles:list"],
        upd_date: "2026-06-10T10:00:00.000Z",
      },
    ]);

    renderRolePermissionsTab();
    await screen.findByText("Permissions");

    const manageCheckbox = screen.getByRole("checkbox", { name: /permissions/i });
    await waitFor(() => {
      expect(manageCheckbox).toBeChecked();
    });
    expect(manageCheckbox).toHaveAttribute("aria-disabled", "true");
  });

  it("loads mapping for the newly selected role", async () => {
    const user = userEvent.setup();
    listRolePermissions.mockImplementation(async ({ role }: { role?: string }) => [
      {
        ou_id: null,
        role,
        menu_keys: ["permissions:manage", "profiles:*"],
        upd_date: "2026-06-10T10:00:00.000Z",
      },
    ]);

    renderRolePermissionsTab();
    await screen.findByText("Permissions");

    await user.click(screen.getByRole("combobox", { name: /role:/i }));
    await user.click(await screen.findByRole("option", { name: /^branch admin$/i }));

    await waitFor(() => {
      expect(listRolePermissions).toHaveBeenCalledWith({ role: "branch_admin" });
    });
  });

  it("does not stay loading when menu registry is empty", async () => {
    renderRolePermissionsTab({ menus: [] });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled();
    });
    expect(screen.getByText("No menu nodes in registry")).toBeInTheDocument();
  });

  it("prompts before discarding unsaved changes when switching role", async () => {
    const user = userEvent.setup();
    listRolePermissions.mockImplementation(async ({ role }: { role?: string }) => [
      {
        ou_id: null,
        role,
        menu_keys: ["permissions:manage", "profiles:*"],
        upd_date: "2026-06-10T10:00:00.000Z",
      },
    ]);

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    await user.click(screen.getByRole("checkbox", { name: /staff list/i }));
    await user.click(screen.getByRole("combobox", { name: /role:/i }));
    await user.click(await screen.findByRole("option", { name: /^branch admin$/i }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^discard$/i }));
    await waitFor(() => {
      expect(listRolePermissions).toHaveBeenCalledWith({ role: "branch_admin" });
    });
  });

  it("does not switch role when discard dialog is cancelled", async () => {
    const user = userEvent.setup();

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    await user.click(screen.getByRole("checkbox", { name: /staff list/i }));
    await user.click(screen.getByRole("combobox", { name: /role:/i }));
    await user.click(await screen.findByRole("option", { name: /^branch admin$/i }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(listRolePermissions).not.toHaveBeenCalledWith({ role: "branch_admin" });
    expect(listRolePermissions).toHaveBeenCalledTimes(1);
    expect(listRolePermissions).toHaveBeenCalledWith({ role: "platform_admin" });
  });

  it("does not save when save dialog is cancelled", async () => {
    const user = userEvent.setup();

    renderRolePermissionsTab();
    await screen.findByText("Permissions");

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Save role permissions?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(upsertRolePermission).not.toHaveBeenCalled();
  });

  it("shows error when save fails but not when post-save reload fails", async () => {
    const user = userEvent.setup();
    let mappingCalls = 0;
    listRolePermissions.mockImplementation(async ({ role }: { role?: string }) => {
      mappingCalls += 1;
      if (mappingCalls > 1) {
        throw new Error("reload failed");
      }
      return [
        {
          ou_id: null,
          role,
          menu_keys: ["permissions:manage", "profiles:*"],
          upd_date: "2026-06-10T10:00:00.000Z",
        },
      ];
    });
    upsertRolePermission.mockResolvedValue({
      ou_id: "null",
      role: "platform_admin",
      menu_keys: ["permissions:manage", "profiles:*"],
      revoked_sessions: false,
      revoked_users_count: 0,
    });

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await user.click(await screen.findByRole("button", { name: /^save only$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.success).toHaveBeenCalledWith(expect.stringContaining("refresh their session"));
    });
    expect(mockFeedback.message.error).not.toHaveBeenCalled();
  });

  it("shows API error when save returns failure", async () => {
    const user = userEvent.setup();
    const err = new Error("Bad Request") as import("axios").AxiosError;
    err.isAxiosError = true;
    err.response = {
      status: 400,
      statusText: "Bad Request",
      data: {
        code: "AUTH_INVALID_REQUEST",
        detail: "Cannot remove permissions:manage from platform_admin",
      },
      headers: {},
      config: { headers: {} } as import("axios").InternalAxiosRequestConfig,
    };
    upsertRolePermission.mockRejectedValue(err);

    renderRolePermissionsTab();
    await screen.findByText("Permissions");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await user.click(await screen.findByRole("button", { name: /^save only$/i }));

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith("Failed to save role permissions");
    });
  });
});
