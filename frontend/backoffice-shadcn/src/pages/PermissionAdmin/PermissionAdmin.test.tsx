import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionAdmin from './index';
import { renderWithProviders } from '../../test/renderWithProviders';

const listAdminMenus = vi.fn();

vi.mock('../../lib/authApiClient', () => ({
  listAdminMenus: (...args: unknown[]) => listAdminMenus(...args),
  listRolePermissions: vi.fn().mockResolvedValue([]),
}));

describe('PermissionAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminMenus.mockResolvedValue([]);
  });

  it('renders Menu catalog and Role permissions tabs', () => {
    renderWithProviders(<PermissionAdmin />);
    expect(screen.getByRole('tab', { name: /menu catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /role permissions/i })).toBeInTheDocument();
  });

  it('shows menu catalog panel by default', () => {
    renderWithProviders(<PermissionAdmin />);
    expect(screen.getByTestId('menu-catalog-tab')).toBeInTheDocument();
  });

  it('switches to role permissions tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionAdmin />);
    await user.click(screen.getByRole('tab', { name: /role permissions/i }));
    expect(screen.getByTestId('role-permissions-tab')).toBeInTheDocument();
  });

  it('lazy-mounts role tab so listAdminMenus is not called until that tab opens', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionAdmin />);

    expect(screen.getByTestId('menu-catalog-tab')).toBeInTheDocument();
    const callsBeforeRoleTab = listAdminMenus.mock.calls.length;
    expect(callsBeforeRoleTab).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('tab', { name: /role permissions/i }));
    expect(screen.getByTestId('role-permissions-tab')).toBeInTheDocument();
    expect(listAdminMenus.mock.calls.length).toBeGreaterThan(callsBeforeRoleTab);
  });
});
