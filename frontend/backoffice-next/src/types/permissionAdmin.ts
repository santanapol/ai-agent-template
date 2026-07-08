export type MenuNodeType = "menu" | "action";

export interface AdminMenuNode {
  key: string;
  label: string;
  type: MenuNodeType;
  parent_key: string | null;
  sort_order: number;
  upd_date: string;
}

export interface CreateMenuPayload {
  key: string;
  label: string;
  type: MenuNodeType;
  parent_key: string | null;
  sort_order: number;
}

export interface UpdateMenuPayload {
  label?: string;
  parent_key?: string | null;
  sort_order?: number;
}

export interface RolePermissionMapping {
  ou_id: null;
  role: string;
  menu_keys: string[];
  upd_date: string;
}

export interface UpsertRolePermissionPayload {
  menu_keys: string[];
  revoke_sessions?: boolean;
}

export interface UpsertRolePermissionResult {
  ou_id: string | null;
  role: string;
  menu_keys: string[];
  revoked_sessions: boolean;
  revoked_users_count: number;
}

export const KNOWN_ROLES = ["platform_admin", "branch_admin", "support_admin", "support", "staff"] as const;
export type KnownRole = (typeof KNOWN_ROLES)[number];

export const PROTECTED_MENU_KEY = "permissions:manage";
