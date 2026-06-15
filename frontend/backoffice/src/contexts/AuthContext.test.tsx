
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
});
