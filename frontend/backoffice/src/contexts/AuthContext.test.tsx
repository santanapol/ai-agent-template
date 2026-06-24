
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '../lib/authApiClient';

vi.mock('../lib/authApiClient', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  getMyMenus: vi.fn(),
}));

let sessionRefresh: (() => Promise<string | null>) | null = null;

vi.mock('../lib/baseApiClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/baseApiClient')>();
  return {
    ...mod,
    setRefreshCallback: (fn: (() => Promise<string | null>) | null) => {
      sessionRefresh = fn;
      mod.setRefreshCallback(fn);
    },
  };
});

// Mock token: sub: "123", role: "platform_admin", exp: 1 year from now
const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoicGxhdGZvcm1fYWRtaW4iLCJleHAiOjE5MjQ5OTk5OTl9.signature";

const TestComponent = () => {
  const { user, permissions, menus, login } = useAuth();
  
  return (
    <div>
      <div data-testid="user-id">{user ? user.sub : 'no-user'}</div>
      <div data-testid="permissions">{permissions.join(',')}</div>
      <div data-testid="menus">{menus.length}</div>
      <button onClick={() => login('test', 'password')}>Login</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('stores permissions from login and fetches menus', async () => {
    const mockedLogin = authApi.login as Mock;
    const mockedGetMyMenus = authApi.getMyMenus as Mock;
    const mockedRefresh = authApi.refresh as Mock;

    mockedRefresh.mockRejectedValue(new Error('No session'));

    mockedLogin.mockResolvedValue({
      access_token: mockToken,
      permissions: ['profiles:create', 'profiles:edit'],
    });

    mockedGetMyMenus.mockResolvedValue([
      { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
    ]);

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial effect (refresh rejection) to settle
    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('no-user');
    });

    expect(screen.getByTestId('permissions').textContent).toBe('');
    expect(screen.getByTestId('menus').textContent).toBe('0');

    // Trigger login
    await user.click(screen.getByText('Login'));

    // Verify context state updates correctly
    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('123');
      expect(screen.getByTestId('permissions').textContent).toBe('profiles:create,profiles:edit');
      expect(screen.getByTestId('menus').textContent).toBe('1');
    });

    expect(mockedGetMyMenus).toHaveBeenCalledTimes(1);
  });

  test('reloads menus after token refresh when user session is restored (SC-3)', async () => {
    const mockedLogin = authApi.login as Mock;
    const mockedGetMyMenus = authApi.getMyMenus as Mock;
    const mockedRefresh = authApi.refresh as Mock;

    mockedRefresh.mockRejectedValueOnce(new Error('No session'));

    mockedLogin.mockResolvedValue({
      access_token: mockToken,
      permissions: ['profiles:lookup', 'invoices:list'],
    });

    const menusWithInvoices = [
      { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
      { key: 'billing', label: 'Billing', type: 'menu', parent_key: null, sort_order: 10 },
      { key: 'invoices:list', label: 'Invoices', type: 'action', parent_key: 'billing', sort_order: 10 },
    ];
    const menusWithoutInvoices = [
      { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
    ];

    mockedGetMyMenus
      .mockResolvedValueOnce(menusWithInvoices)
      .mockResolvedValueOnce(menusWithoutInvoices);

    mockedRefresh.mockResolvedValueOnce({
      access_token: mockToken,
      permissions: ['profiles:lookup'],
    });

    const MenuProbe = () => {
      const { menus, permissions } = useAuth();
      return (
        <div>
          <div data-testid="menu-keys">{menus.map((m) => m.key).join(',')}</div>
          <div data-testid="session-permissions">{permissions.join(',')}</div>
          <button type="button" onClick={() => void sessionRefresh?.()}>
            Refresh session
          </button>
        </div>
      );
    };

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
        <MenuProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id').textContent).toBe('no-user');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('menu-keys').textContent).toContain('invoices:list');
    });
    expect(mockedGetMyMenus).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Refresh session'));

    await waitFor(() => {
      expect(screen.getByTestId('menu-keys').textContent).toBe('dashboard');
      expect(screen.getByTestId('session-permissions').textContent).toBe('profiles:lookup');
    });
    expect(mockedGetMyMenus).toHaveBeenCalledTimes(2);
  });
});
