import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuCatalogTab from './MenuCatalogTab';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { AdminMenuNode } from '../../types/permissionAdmin';

const listAdminMenus = vi.fn();
const createAdminMenu = vi.fn();
const updateAdminMenu = vi.fn();
const deleteAdminMenu = vi.fn();

vi.mock('../../lib/authApiClient', () => ({
  listAdminMenus: (...args: unknown[]) => listAdminMenus(...args),
  createAdminMenu: (...args: unknown[]) => createAdminMenu(...args),
  updateAdminMenu: (...args: unknown[]) => updateAdminMenu(...args),
  deleteAdminMenu: (...args: unknown[]) => deleteAdminMenu(...args),
}));

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}));

vi.mock('../../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

const sampleMenus: AdminMenuNode[] = [
  {
    key: 'settings',
    label: 'Settings',
    type: 'menu',
    parent_key: null,
    sort_order: 90,
    upd_date: '2026-06-10T10:00:00.000Z',
  },
  {
    key: 'permissions:manage',
    label: 'Permissions',
    type: 'action',
    parent_key: 'settings',
    sort_order: 10,
    upd_date: '2026-06-10T11:00:00.000Z',
  },
  {
    key: 'sit:test',
    label: 'SIT Test',
    type: 'action',
    parent_key: 'settings',
    sort_order: 20,
    upd_date: '2026-06-10T12:00:00.000Z',
  },
];

function axios403() {
  const err = new Error('Forbidden') as import('axios').AxiosError;
  err.isAxiosError = true;
  err.response = {
    status: 403,
    statusText: 'Forbidden',
    data: { code: 'AUTH_FORBIDDEN' },
    headers: {},
    config: {} as import('axios').AxiosError['config'],
  };
  return err;
}

describe('MenuCatalogTab', () => {
  beforeEach(() => {
    listAdminMenus.mockReset();
    createAdminMenu.mockReset();
    updateAdminMenu.mockReset();
    deleteAdminMenu.mockReset();
    listAdminMenus.mockResolvedValue(sampleMenus);
  });

  it('loads and displays menu tree', async () => {
    renderWithProviders(<MenuCatalogTab />);
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(listAdminMenus).toHaveBeenCalled();
  });

  it('shows forbidden result when API returns 403', async () => {
    listAdminMenus.mockRejectedValue(axios403());
    renderWithProviders(<MenuCatalogTab />);
    expect(await screen.findByText('403 Forbidden')).toBeInTheDocument();
  });

  it('disables edit and delete for permissions:manage', async () => {
    renderWithProviders(<MenuCatalogTab />);
    await screen.findByText('Permissions');

    expect(screen.getByRole('button', { name: /edit permissions/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete permissions/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /edit sit test/i })).not.toBeDisabled();
  });

  it('opens create modal and calls createAdminMenu on submit', async () => {
    const user = userEvent.setup();
    createAdminMenu.mockResolvedValue({
      key: 'new:action',
      label: 'New Action',
      type: 'action',
      parent_key: 'settings',
      sort_order: 30,
      upd_date: '2026-06-10T13:00:00.000Z',
    });

    renderWithProviders(<MenuCatalogTab />);
    await screen.findByText('Settings');

    await user.click(screen.getByRole('button', { name: /add node/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^key$/i), 'new:action');
    await user.type(within(dialog).getByLabelText(/^label$/i), 'New Action');
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(createAdminMenu).toHaveBeenCalledWith({
        key: 'new:action',
        label: 'New Action',
        type: 'action',
        parent_key: null,
        sort_order: 10,
      });
    });
  });

  it('calls deleteAdminMenu with If-Match upd_date', async () => {
    const user = userEvent.setup();
    deleteAdminMenu.mockResolvedValue(undefined);

    renderWithProviders(<MenuCatalogTab />);
    await screen.findByText('SIT Test');

    await user.click(screen.getByRole('button', { name: /delete sit test/i }));
    const confirmButtons = await screen.findAllByRole('button', { name: /^delete$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(deleteAdminMenu).toHaveBeenCalledWith(
        'sit:test',
        '2026-06-10T12:00:00.000Z',
      );
    });
  });
});
