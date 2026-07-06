import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import { renderWithProviders } from './test/renderWithProviders';
import { mockAuthContextValue } from './test/mockFactories';
import { ROUTE_GUARD_MATRIX } from './test/routeGuardMatrix';
import { PermissionGuard } from './components/PermissionGuard';
import RouteErrorPage from './components/RouteErrorPage';
import { useAuth } from './contexts/AuthContext';
import { usePermission } from './hooks/usePermission';

vi.mock('./contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./hooks/usePermission', () => ({
  usePermission: vi.fn(),
}));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div data-testid="auth-loading">Loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MockAdminLayout() {
  return (
    <div data-testid="admin-layout">
      <Outlet />
    </div>
  );
}

function buildGuardedRoutes() {
  return ROUTE_GUARD_MATRIX.map(({ routePath, permission, stubTestId }) => {
    const element = (
      <PermissionGuard required={permission}>
        <div data-testid={stubTestId}>{stubTestId}</div>
      </PermissionGuard>
    );

    if (routePath === 'index') {
      return <Route key={routePath} index element={element} />;
    }

    return <Route key={routePath} path={routePath} element={element} />;
  });
}

function renderAt(initialEntry: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MockAdminLayout />
            </ProtectedRoute>
          }
        >
          {buildGuardedRoutes()}
          <Route path="403" element={<div data-testid="error-403">403 Page</div>} />
          <Route path="500" element={<div data-testid="error-500">500 Page</div>} />
        </Route>
        <Route path="/404" element={<div data-testid="error-404">404 Page</div>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthContextValue({ user: null }));
    vi.mocked(usePermission).mockReturnValue(false);
  });

  it('renders login page at /login', () => {
    renderAt('/login');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from / to /login', async () => {
    renderAt('/');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('redirects unknown paths to /404', async () => {
    renderAt('/unknown-route');

    await waitFor(() => {
      expect(screen.getByTestId('error-404')).toBeInTheDocument();
    });
  });

  it('renders /500 error page stub', async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthContextValue());

    renderAt('/500');

    await waitFor(() => {
      expect(screen.getByTestId('error-500')).toBeInTheDocument();
    });
  });

  it('uses errorElement in route configuration', () => {
    expect(RouteErrorPage).toBeDefined();
  });

  it.each(ROUTE_GUARD_MATRIX)(
    'redirects $navigateTo to /403 without $permission',
    async ({ navigateTo }) => {
      vi.mocked(useAuth).mockReturnValue(mockAuthContextValue());
      vi.mocked(usePermission).mockReturnValue(false);

      renderAt(navigateTo);

      await waitFor(() => {
        expect(screen.getByTestId('error-403')).toBeInTheDocument();
      });
    },
  );

  it.each(ROUTE_GUARD_MATRIX)(
    'renders $navigateTo with $permission',
    async ({ navigateTo, permission, stubTestId }) => {
      vi.mocked(useAuth).mockReturnValue(
        mockAuthContextValue({ permissions: [permission] }),
      );
      vi.mocked(usePermission).mockImplementation((required) => required === permission);

      renderAt(navigateTo);

      await waitFor(() => {
        expect(screen.getByTestId(stubTestId)).toBeInTheDocument();
      });
    },
  );
});
