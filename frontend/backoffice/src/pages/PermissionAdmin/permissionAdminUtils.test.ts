import { describe, expect, it } from 'vitest';
import type { AdminMenuNode } from '../../types/permissionAdmin';
import {
  buildMenuTree,
  isProtectedMenuKey,
  splitMappingKeys,
  buildSaveMenuKeys,
  buildRoleSaveMenuKeys,
  isPlatformAdminManageCheckboxDisabled,
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

  describe('isProtectedMenuKey', () => {
    it('returns true only for permissions:manage', () => {
      expect(isProtectedMenuKey('permissions:manage')).toBe(true);
      expect(isProtectedMenuKey('profiles:list')).toBe(false);
    });
  });

  describe('isPlatformAdminManageCheckboxDisabled', () => {
    it('locks permissions:manage for platform_admin without permissions:*', () => {
      expect(isPlatformAdminManageCheckboxDisabled('platform_admin', 'permissions:manage', [])).toBe(
        true,
      );
    });

    it('allows manage checkbox when permissions:* wildcard is present', () => {
      expect(
        isPlatformAdminManageCheckboxDisabled('platform_admin', 'permissions:manage', [
          'permissions:*',
        ]),
      ).toBe(false);
    });
  });

  describe('splitMappingKeys and buildSaveMenuKeys', () => {
    it('preserves wildcards when building save payload', () => {
      const { exact, wildcards } = splitMappingKeys(['profiles:*', 'profiles:list']);
      expect(exact).toEqual(['profiles:list']);
      expect(wildcards).toEqual(['profiles:*']);
      expect(buildSaveMenuKeys(['profiles:read'], wildcards)).toEqual([
        'profiles:read',
        'profiles:*',
      ]);
    });
  });

  describe('buildRoleSaveMenuKeys', () => {
    it('forces permissions:manage for platform_admin without permissions:*', () => {
      expect(buildRoleSaveMenuKeys('platform_admin', ['profiles:list'], [])).toEqual(
        expect.arrayContaining(['permissions:manage', 'profiles:list']),
      );
      expect(buildRoleSaveMenuKeys('platform_admin', ['profiles:list'], [])).toHaveLength(2);
    });

    it('does not force permissions:manage when permissions:* wildcard is present', () => {
      expect(buildRoleSaveMenuKeys('platform_admin', ['profiles:list'], ['permissions:*'])).toEqual(
        ['profiles:list', 'permissions:*'],
      );
    });
  });
});
