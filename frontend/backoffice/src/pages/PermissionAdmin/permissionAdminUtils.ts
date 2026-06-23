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

export function collectMenuKeys(flat: AdminMenuNode[]): string[] {
  return flat.map((item) => item.key);
}

export function isProtectedMenuKey(key: string): boolean {
  return key === PROTECTED_MENU_KEY;
}

export function platformAdminHasManagePermission(menuKeys: string[]): boolean {
  return menuKeys.includes('permissions:manage') || menuKeys.includes('permissions:*');
}

export function ifMatchFromUpdDate(updDate: string): string {
  return updDate;
}
