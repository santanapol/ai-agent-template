import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuTree } from './MenuTree';
import type { MenuTreeNode } from '@/pages/permission-admin/permissionAdminUtils';

const nodes: MenuTreeNode[] = [
  {
    key: 'billing',
    label: 'Billing',
    children: [
      { key: 'invoices:list', label: 'Invoices' },
      { key: 'agents:list', label: 'Agents' },
    ],
  },
  { key: 'staff', label: 'Staff' },
];

describe('MenuTree', () => {
  test('renders node labels and keys', () => {
    render(<MenuTree nodes={nodes} />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('(billing)')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('(staff)')).toBeInTheDocument();
  });

  test('renders checkboxes when checkable', () => {
    render(<MenuTree nodes={nodes} checkable checkedKeys={[]} onCheckedChange={() => {}} />);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });
});
