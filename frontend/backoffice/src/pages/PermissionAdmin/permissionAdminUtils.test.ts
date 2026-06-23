import { describe, expect, it } from 'vitest';
import type { AdminMenuNode } from '../../types/permissionAdmin';
import {
  buildMenuTree,
  collectMenuKeys,
  isProtectedMenuKey,
  platformAdminHasManagePermission,
} from './permissionAdminUtils';

function node(
  key: string,
  overrides: Partial<AdminMenuNode> = {},
): AdminMenuNode {
  return {
    key,
    label: key,
    type: 'action',
    parent_key: null,
    sort_order: 10,
    upd_date: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('permissionAdminUtils', () => {
  describe('buildMenuTree', () => {
    it('builds hierarchy sorted by sort_order at each level', () => {
      const flat: AdminMenuNode[] = [
        node('staff', { type: 'menu', sort_order: 20 }),
        node('settings', { type: 'menu', sort_order: 30 }),
        node('profiles:list', { parent_key: 'staff', sort_order: 20 }),
        node('permissions:manage', { parent_key: 'settings', sort_order: 10 }),
      ];

      const tree = buildMenuTree(flat);

      expect(tree.map((n) => n.key)).toEqual(['staff', 'settings']);
      expect(tree[0].children?.map((n) => n.key)).toEqual(['profiles:list']);
      expect(tree[1].children?.map((n) => n.key)).toEqual(['permissions:manage']);
    });

    it('treats orphan nodes as top-level items', () => {
      const flat = [node('orphan', { parent_key: 'missing', sort_order: 5 })];
      const tree = buildMenuTree(flat);
      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('orphan');
    });

    it('returns empty array for empty input', () => {
      expect(buildMenuTree([])).toEqual([]);
    });
  });

  describe('collectMenuKeys', () => {
    it('collects all keys from flat list', () => {
      const flat = [
        node('a'),
        node('b', { parent_key: 'a' }),
      ];
      expect(collectMenuKeys(flat).sort()).toEqual(['a', 'b']);
    });
  });

  describe('isProtectedMenuKey', () => {
    it('returns true only for permissions:manage', () => {
      expect(isProtectedMenuKey('permissions:manage')).toBe(true);
      expect(isProtectedMenuKey('profiles:list')).toBe(false);
    });
  });

  describe('platformAdminHasManagePermission', () => {
    it('accepts exact permissions:manage', () => {
      expect(platformAdminHasManagePermission(['permissions:manage'])).toBe(true);
    });

    it('accepts permissions:* wildcard', () => {
      expect(platformAdminHasManagePermission(['permissions:*', 'profiles:list'])).toBe(true);
    });

    it('rejects when neither manage nor wildcard present', () => {
      expect(platformAdminHasManagePermission(['profiles:*'])).toBe(false);
    });
  });
});
