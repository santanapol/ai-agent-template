import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminMenuNode, CreateMenuPayload, UpsertRolePermissionPayload } from "../types/permissionAdmin";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("./baseApiClient", () => ({
  baseClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import {
  createAdminMenu,
  deleteAdminMenu,
  deleteRolePermission,
  getMyBranch,
  listAdminMenus,
  listMyBranches,
  listRolePermissions,
  switchActiveBranch,
  updateAdminMenu,
  upsertRolePermission,
} from "./authApiClient";

const sampleMenu: AdminMenuNode = {
  key: "test:action",
  label: "Test",
  type: "action",
  parent_key: "settings",
  sort_order: 10,
  upd_date: "2026-06-10T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authApiClient admin methods", () => {
  it("listAdminMenus unwraps menus envelope", async () => {
    mockGet.mockResolvedValue({ data: { menus: [sampleMenu] } });
    const result = await listAdminMenus();
    expect(mockGet).toHaveBeenCalledWith("/auth/admin/menus");
    expect(result).toEqual([sampleMenu]);
  });

  it("createAdminMenu posts payload", async () => {
    const payload: CreateMenuPayload = {
      key: "new:action",
      label: "New",
      type: "action",
      parent_key: "settings",
      sort_order: 20,
    };
    mockPost.mockResolvedValue({ data: sampleMenu });
    await createAdminMenu(payload);
    expect(mockPost).toHaveBeenCalledWith("/auth/admin/menus", payload);
  });

  it("updateAdminMenu sends raw ISO If-Match", async () => {
    mockPatch.mockResolvedValue({ data: sampleMenu });
    await updateAdminMenu("test:action", { label: "Updated" }, sampleMenu.upd_date);
    expect(mockPatch).toHaveBeenCalledWith(
      "/auth/admin/menus/test%3Aaction",
      { label: "Updated" },
      { headers: { "If-Match": "2026-06-10T12:00:00.000Z" } },
    );
  });

  it("deleteAdminMenu sends raw ISO If-Match", async () => {
    mockDelete.mockResolvedValue({});
    await deleteAdminMenu("test:action", sampleMenu.upd_date);
    expect(mockDelete).toHaveBeenCalledWith("/auth/admin/menus/test%3Aaction", {
      headers: { "If-Match": "2026-06-10T12:00:00.000Z" },
    });
  });

  it("listRolePermissions unwraps role_permissions envelope", async () => {
    const mapping = {
      ou_id: null,
      role: "branch_admin",
      menu_keys: ["profiles:*"],
      upd_date: "2026-06-10T12:00:00.000Z",
    };
    mockGet.mockResolvedValue({ data: { role_permissions: [mapping] } });
    const result = await listRolePermissions({ role: "branch_admin" });
    expect(mockGet).toHaveBeenCalledWith("/auth/admin/role-permissions", {
      params: { role: "branch_admin" },
    });
    expect(result).toEqual([mapping]);
  });

  it("upsertRolePermission PUTs without If-Match", async () => {
    const payload: UpsertRolePermissionPayload = {
      menu_keys: ["profiles:*"],
      revoke_sessions: true,
    };
    mockPut.mockResolvedValue({
      data: {
        ou_id: "null",
        role: "branch_admin",
        menu_keys: ["profiles:*"],
        revoked_sessions: true,
        revoked_users_count: 2,
      },
    });
    await upsertRolePermission("branch_admin", payload);
    expect(mockPut).toHaveBeenCalledWith("/auth/admin/role-permissions/null/branch_admin", payload);
    const config = mockPut.mock.calls[0][2];
    expect(config).toBeUndefined();
  });

  it("deleteRolePermission sends confirm query when requested", async () => {
    mockDelete.mockResolvedValue({});
    await deleteRolePermission("branch_admin", { confirm: true });
    expect(mockDelete).toHaveBeenCalledWith("/auth/admin/role-permissions/null/branch_admin", {
      params: { confirm: true },
    });
  });

  it("switchActiveBranch posts branch_id to /auth/me/active-branch", async () => {
    const tokenResponse = {
      access_token: "new-token",
      expires_in: 900,
      token_type: "Bearer",
      permissions: ["profiles:*"],
    };
    mockPost.mockResolvedValue({ data: tokenResponse });
    const result = await switchActiveBranch("507f1f77bcf86cd799439011");
    expect(mockPost).toHaveBeenCalledWith("/auth/me/active-branch", {
      branch_id: "507f1f77bcf86cd799439011",
    });
    expect(result).toEqual(tokenResponse);
  });

  it("getMyBranch fetches active branch summary", async () => {
    const branch = {
      branch_id: "5f4fb5bb3156af7a2db9e5a0",
      branch_code: "7W",
      branch_name: "777WW",
      active: true,
    };
    mockGet.mockResolvedValue({ data: branch });
    const result = await getMyBranch();
    expect(mockGet).toHaveBeenCalledWith("/auth/me/branch");
    expect(result).toEqual(branch);
  });

  it("listMyBranches unwraps branches envelope", async () => {
    const branches = [
      {
        branch_id: "5f4fb5bb3156af7a2db9e5a0",
        branch_code: "7W",
        branch_name: "777WW",
        active: true,
      },
    ];
    mockGet.mockResolvedValue({ data: { branches } });
    const result = await listMyBranches();
    expect(mockGet).toHaveBeenCalledWith("/auth/me/branches", { signal: undefined });
    expect(result).toEqual(branches);
  });
});
