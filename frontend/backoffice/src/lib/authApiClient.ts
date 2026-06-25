import type { TokenResponse, MenuNode } from '../types/auth';
import type {
  AdminMenuNode,
  CreateMenuPayload,
  UpdateMenuPayload,
  RolePermissionMapping,
  UpsertRolePermissionPayload,
  UpsertRolePermissionResult,
} from '../types/permissionAdmin';
import { ifMatchFromUpdDate } from './adminApiUtils';
import { baseClient as authClient } from './baseApiClient';

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>('/auth/login', {
    username,
    password,
    client_kind: 'web',
  });
  return res.data;
}

export async function refresh(): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>('/auth/refresh', {});
  return res.data;
}

export async function logout(): Promise<void> {
  await authClient.post('/auth/logout', {});
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await authClient.post('/auth/me/password', payload);
}

export async function switchActiveBranch(branch_id: string): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>('/auth/me/active-branch', { branch_id });
  return res.data;
}

export async function getMyMenus(): Promise<MenuNode[]> {
  const res = await authClient.get<{ menus: MenuNode[] }>('/auth/me/menus');
  return res.data.menus;
}

export async function listAdminMenus(): Promise<AdminMenuNode[]> {
  const res = await authClient.get<{ menus: AdminMenuNode[] }>('/auth/admin/menus');
  return res.data.menus;
}

export async function createAdminMenu(payload: CreateMenuPayload): Promise<AdminMenuNode> {
  const res = await authClient.post<AdminMenuNode>('/auth/admin/menus', payload);
  return res.data;
}

export async function updateAdminMenu(
  key: string,
  payload: UpdateMenuPayload,
  updDate: string,
): Promise<AdminMenuNode> {
  const res = await authClient.patch<AdminMenuNode>(
    `/auth/admin/menus/${encodeURIComponent(key)}`,
    payload,
    { headers: { 'If-Match': ifMatchFromUpdDate(updDate) } },
  );
  return res.data;
}

export async function deleteAdminMenu(key: string, updDate: string): Promise<void> {
  await authClient.delete(`/auth/admin/menus/${encodeURIComponent(key)}`, {
    headers: { 'If-Match': ifMatchFromUpdDate(updDate) },
  });
}

export async function listRolePermissions(
  params: { role?: string; ou_id?: string | null } = {},
): Promise<RolePermissionMapping[]> {
  const query: Record<string, string> = {};
  if (params.role) query.role = params.role;
  if (params.ou_id === null) query.ou_id = 'null';
  else if (params.ou_id !== undefined) query.ou_id = params.ou_id;

  const res = await authClient.get<{ role_permissions: RolePermissionMapping[] }>(
    '/auth/admin/role-permissions',
    { params: query },
  );
  return res.data.role_permissions;
}

export async function upsertRolePermission(
  role: string,
  payload: UpsertRolePermissionPayload,
): Promise<UpsertRolePermissionResult> {
  const res = await authClient.put<UpsertRolePermissionResult>(
    `/auth/admin/role-permissions/null/${encodeURIComponent(role)}`,
    payload,
  );
  return res.data;
}

export async function deleteRolePermission(
  role: string,
  options?: { confirm?: boolean },
): Promise<void> {
  await authClient.delete(
    `/auth/admin/role-permissions/null/${encodeURIComponent(role)}`,
    { params: options?.confirm ? { confirm: true } : undefined },
  );
}
