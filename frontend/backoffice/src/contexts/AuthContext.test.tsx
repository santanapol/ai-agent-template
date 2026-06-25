
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '../lib/authApiClient';

vi.mock('../lib/authApiClient', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  getMyMenus: vi.fn(),
  switchActiveBranch: vi.fn(),
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

function makeJwt(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

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

  test('switchBranch calls active-branch API and updates user branch_id claim', async () => {
    const mockedRefresh = authApi.refresh as Mock;
    const mockedSwitch = authApi.switchActiveBranch as Mock;

    mockedRefresh.mockRejectedValue(new Error('No session'));

    const homeBranch = '507f1f77bcf86cd799439012';
    const activeBranch = '507f1f77bcf86cd799439014';
    const initialToken = makeJwt({
      sub: '123',
      role: 'platform_admin',
      ou_id: '507f1f77bcf86cd799439011',
      branch_id: homeBranch,
      home_branch_id: homeBranch,
      token_gen: 0,
      exp: 1924999999,
    });
    const switchedToken = makeJwt({
      sub: '123',
      role: 'platform_admin',
      ou_id: '507f1f77bcf86cd799439011',
      branch_id: activeBranch,
      home_branch_id: homeBranch,
      token_gen: 0,
      exp: 1924999999,
    });

    mockedSwitch.mockResolvedValue({
      access_token: switchedToken,
      expires_in: 900,
      token_type: 'Bearer',
      permissions: ['profiles:*'],
    });

    const BranchProbe = () => {
      const { user, switchBranch, login } = useAuth();
      return (
        <div>
          <div data-testid="branch-id">{user?.branch_id ?? 'none'}</div>
          <div data-testid="home-branch-id">{user?.home_branch_id ?? 'none'}</div>
          <button type="button" onClick={() => void login('demo', 'password')}>
            Login
          </button>
          <button type="button" onClick={() => void switchBranch(activeBranch)}>
            Switch branch
          </button>
        </div>
      );
    };

    const mockedLogin = authApi.login as Mock;
    const mockedGetMyMenus = authApi.getMyMenus as Mock;
    mockedGetMyMenus.mockResolvedValue([]);
    mockedLogin.mockResolvedValue({
      access_token: initialToken,
      permissions: ['profiles:*'],
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <BranchProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('branch-id').textContent).toBe('none');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('branch-id').textContent).toBe(homeBranch);
      expect(screen.getByTestId('home-branch-id').textContent).toBe(homeBranch);
    });

    await user.click(screen.getByText('Switch branch'));

    await waitFor(() => {
      expect(mockedSwitch).toHaveBeenCalledWith(activeBranch);
      expect(screen.getByTestId('branch-id').textContent).toBe(activeBranch);
      expect(screen.getByTestId('home-branch-id').textContent).toBe(homeBranch);
    });
  });

  test('switchBranch refreshes session when active-branch returns AUTH_NOT_READY', async () => {
    const mockedRefresh = authApi.refresh as Mock;
    const mockedSwitch = authApi.switchActiveBranch as Mock;

    const homeBranch = '507f1f77bcf86cd799439012';
    const activeBranch = '507f1f77bcf86cd799439014';
    const refreshedToken = makeJwt({
      sub: '123',
      role: 'platform_admin',
      ou_id: '507f1f77bcf86cd799439011',
      branch_id: activeBranch,
      home_branch_id: homeBranch,
      token_gen: 1,
      exp: 1924999999,
    });

    const notReady = new axios.AxiosError(
      'Service Unavailable',
      axios.AxiosError.ERR_BAD_RESPONSE,
      {},
      {},
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: {} as never,
        data: { code: 'AUTH_NOT_READY' },
      },
    );
    mockedSwitch.mockRejectedValue(notReady);
    mockedRefresh
      .mockRejectedValueOnce(new Error('No session'))
      .mockResolvedValueOnce({
        access_token: refreshedToken,
        expires_in: 900,
        token_type: 'Bearer',
        permissions: ['profiles:*'],
      });

    const BranchProbe = () => {
      const { user, switchBranch } = useAuth();
      return (
        <div>
          <div data-testid="branch-id">{user?.branch_id ?? 'none'}</div>
          <button type="button" onClick={() => void switchBranch(activeBranch)}>
            Switch branch
          </button>
        </div>
      );
    };

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <BranchProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByText('Switch branch'));

    await waitFor(() => {
      expect(mockedRefresh).toHaveBeenCalled();
      expect(screen.getByTestId('branch-id').textContent).toBe(activeBranch);
    });
  });
});
