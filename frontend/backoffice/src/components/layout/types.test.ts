import { describe, expect, it } from 'vitest';
import { isDetailRoute, resolveSidebarBreadcrumb } from './types';

const menuTree = [
  {
    key: 'billing',
    label: 'Billing',
    sort_order: 1,
    children: [
      { key: 'invoices:list', label: 'Invoices', route: '/invoices', sort_order: 1 },
      { key: 'agents:list', label: 'Agents', route: '/agents', sort_order: 2 },
    ],
  },
];

describe('isDetailRoute', () => {
  it('matches invoice detail paths', () => {
    expect(isDetailRoute('/invoices/6a44ca1d57c0f13dd05f6731')).toBe(true);
  });

  it('does not match invoice list', () => {
    expect(isDetailRoute('/invoices')).toBe(false);
  });
});

describe('resolveSidebarBreadcrumb', () => {
  it('resolves nested invoice detail under billing menu', () => {
    expect(resolveSidebarBreadcrumb(menuTree, '/invoices/abc123')).toEqual({
      parent: 'Billing',
      page: 'Invoices',
    });
  });

  it('does not use raw object id as page title on detail routes', () => {
    const result = resolveSidebarBreadcrumb(menuTree, '/invoices/6a44ca1d57c0f13dd05f6731');
    expect(result.page).not.toBe('6a44ca1d57c0f13dd05f6731');
  });
});
