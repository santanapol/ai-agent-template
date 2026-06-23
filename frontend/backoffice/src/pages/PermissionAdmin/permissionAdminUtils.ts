import type { AdminMenuNode } from '../../types/permissionAdmin';
import { PROTECTED_MENU_KEY } from '../../types/permissionAdmin';

export interface MenuTreeNode extends AdminMenuNode {
  children?: MenuTreeNode[];
}

export function buildMenuTree(flat: AdminMenuNode[]): MenuTreeNode[] {
  const byKey = new Map(flat.map((item) => [item.key, { ...item, children: [] as MenuTreeNode[] }]));
  const roots: MenuTreeNode[] = [];

  for (const item of flat) {
    const current = byKey.get(item.key)!;
    const parentKey = item.parent_key;
    if (parentKey && byKey.has(parentKey)) {
      byKey.get(parentKey)!.children!.push(current);
    } else {
      roots.push(current);
    }
  }

  const sortNodes = (nodes: MenuTreeNode[]): MenuTreeNode[] =>
    [...nodes]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((n) => ({
        ...n,
        children: n.children?.length ? sortNodes(n.children) : undefined,
      }));

  return sortNodes(roots);
}

export function isProtectedMenuKey(key: string): boolean {
  return key === PROTECTED_MENU_KEY;
}

export function isWildcardMenuKey(key: string): boolean {
  return key.endsWith(':*');
}

export function splitMappingKeys(menuKeys: string[]): { exact: string[]; wildcards: string[] } {
  const exact: string[] = [];
  const wildcards: string[] = [];
  for (const key of menuKeys) {
    if (isWildcardMenuKey(key)) wildcards.push(key);
    else exact.push(key);
  }
  return { exact, wildcards };
}

export function buildSaveMenuKeys(checkedExact: string[], wildcards: string[]): string[] {
  return [...new Set([...checkedExact, ...wildcards])];
}

/** Ensures platform_admin self-lockout key is always included on save when required. */
export function buildRoleSaveMenuKeys(
  role: string,
  checkedExact: string[],
  wildcards: string[],
): string[] {
  let exact = checkedExact;
  if (isPlatformAdminManageCheckboxDisabled(role, PROTECTED_MENU_KEY, wildcards)) {
    exact = [...new Set([...exact, PROTECTED_MENU_KEY])];
  }
  return buildSaveMenuKeys(exact, wildcards);
}

export function isPlatformAdminManageCheckboxDisabled(
  role: string,
  key: string,
  wildcards: string[],
): boolean {
  if (role !== 'platform_admin' || key !== PROTECTED_MENU_KEY) return false;
  return !wildcards.includes('permissions:*');
}
