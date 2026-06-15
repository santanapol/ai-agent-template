import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PermissionGuard } from './PermissionGuard';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { renderWithProviders } from '../test/renderWithProviders';
import type { DecodedUser } from '../types/auth';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/usePermission', () => ({
  usePermission: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Navigate: vi.fn(({ to }) => <div data-testid="navigate" data-to={to} />),
}));

describe('PermissionGuard component', () => {
  it('renders Spin when loading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      menuLoading: false,
    } as unknown as AuthContextValue);
    vi.mocked(usePermission).mockReturnValue(false);

    renderWithProviders(
      <PermissionGuard required="profiles:list">
        <div data-testid="child">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('renders Spin when menuLoading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123' } as unknown as DecodedUser,
      loading: false,
      menuLoading: true,
    } as unknown as AuthContextValue);
    vi.mocked(usePermission).mockReturnValue(false);

    renderWithProviders(
      <PermissionGuard required="profiles:list">
        <div data-testid="child">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('renders children when user has permission', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123' } as unknown as DecodedUser,
      loading: false,
      menuLoading: false,
    } as unknown as AuthContextValue);
    vi.mocked(usePermission).mockReturnValue(true);

    renderWithProviders(
      <PermissionGuard required="profiles:list">
        <div data-testid="child">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('redirects to /403 when user does not have permission', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123' } as unknown as DecodedUser,
      loading: false,
      menuLoading: false,
    } as unknown as AuthContextValue);
    vi.mocked(usePermission).mockReturnValue(false);

    renderWithProviders(
      <PermissionGuard required="profiles:list">
        <div data-testid="child">Protected Content</div>
      </PermissionGuard>
    );

    const navigateEl = screen.getByTestId('navigate');
    expect(navigateEl).toBeInTheDocument();
    expect(navigateEl.getAttribute('data-to')).toBe('/403');
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });
});
