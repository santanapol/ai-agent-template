import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import type { DecodedUser, MenuNode } from '../types/auth';
import { renderWithProviders } from '../test/renderWithProviders';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/staffApiClient', () => ({
  getProfileByUserId: vi.fn().mockRejectedValue(new Error('skip')),
}));

vi.mock('../lib/invoicesApiClient', () => ({
  listInvoiceAgents: vi.fn().mockResolvedValue({ data: [] }),
}));

const branchAdminUser = { sub: '456', role: 'branch_admin', branch_id: 'b1' } as DecodedUser;

const menusWithInvoices: MenuNode[] = [
  { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
  { key: 'billing', label: 'Billing', type: 'menu', parent_key: null, sort_order: 10 },
  { key: 'invoices:list', label: 'Invoices', type: 'action', parent_key: 'billing', sort_order: 10 },
];

const menusWithoutInvoices: MenuNode[] = [
  { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
];

function renderLayout(menus: MenuNode[]) {
  vi.mocked(useAuth).mockReturnValue({
    user: branchAdminUser,
    permissions: ['profiles:lookup'],
    menus,
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    switchBranch: vi.fn(),
  } as AuthContextValue);

  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<div>Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout sidebar (SC-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Invoices under Billing when branch_admin mapping includes invoices:list', async () => {
    const user = userEvent.setup();
    renderLayout(menusWithInvoices);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    await user.click(screen.getByText('Billing'));
    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });
  });

  it('hides Invoices after role mapping no longer grants invoices:list (post-refresh menus)', async () => {
    const user = userEvent.setup();
    const { rerender } = renderLayout(menusWithInvoices);
    await user.click(screen.getByText('Billing'));
    await waitFor(() => {
      expect(screen.getByText('Invoices')).toBeInTheDocument();
    });

    vi.mocked(useAuth).mockReturnValue({
      user: branchAdminUser,
      permissions: ['profiles:lookup'],
      menus: menusWithoutInvoices,
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      switchBranch: vi.fn(),
    } as AuthContextValue);

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
  });
});
