import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import type { DecodedUser } from '../types/auth';
import { renderWithProviders } from '../test/renderWithProviders';
import { useIsMobile } from '../hooks/useMobile';
import { useTheme } from '../contexts/ThemeContext';
import * as staffApi from '../lib/staffApiClient';

const navigate = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/ThemeContext')>();
  return {
    ...actual,
    useTheme: vi.fn(),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../lib/staffApiClient', () => ({
  getProfileByUserId: vi.fn().mockResolvedValue({
    profile: { firstname: 'John', lastname: 'Doe', user: { username: 'john_doe' } },
  }),
}));

vi.mock('../lib/authApiClient', () => ({
  getMyBranch: vi.fn().mockResolvedValue({
    branch_id: 'b1',
    branch_name: 'Branch One',
    branch_code: 'B1',
    active: true,
  }),
  listMyBranches: vi.fn().mockResolvedValue([]),
}));

vi.mock('../hooks/useMobile', () => ({
  useIsMobile: vi.fn(),
}));

function renderNavbarLayout(pathname = '/staff') {
  vi.mocked(useIsMobile).mockReturnValue(false);
  vi.mocked(useTheme).mockReturnValue({
    theme: 'light',
    toggleTheme: vi.fn(),
  } as ReturnType<typeof useTheme>);

  vi.mocked(useAuth).mockReturnValue({
    user: { sub: '123', role: 'platform_admin', branch_id: 'b1', ou_id: 'ou-1' } as DecodedUser,
    permissions: ['profiles:list'],
    menus: [
      { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
      { key: 'staff', label: 'Staff', type: 'menu', parent_key: null, sort_order: 20 },
      {
        key: 'profiles:list',
        label: 'Staff Management',
        type: 'action',
        parent_key: 'staff',
        sort_order: 10,
      },
    ],
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    lastBranchSwitchAt: null,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    switchBranch: vi.fn(),
  } as AuthContextValue);

  return renderWithProviders(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route path="staff" element={<div>Staff page</div>} />
          <Route index element={<div>Home page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout navbar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows breadcrumb synced to current route', async () => {
    renderNavbarLayout('/staff');

    await waitFor(() => {
      expect(screen.getAllByText('Staff Management').length).toBeGreaterThan(0);
    });
  });

  it('navigates when sidebar menu item is clicked', async () => {
    const user = userEvent.setup();
    renderNavbarLayout('/');

    await waitFor(() => {
      expect(screen.getByText('Staff')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Staff'));
    await user.click(screen.getByText('Staff Management'));
    expect(navigate).toHaveBeenCalledWith('/staff');
  });

  it('shows sidebar trigger on desktop navbar', async () => {
    renderNavbarLayout('/');

    await waitFor(() => {
      expect(document.querySelector('[data-slot="sidebar-trigger"]')).toBeInTheDocument();
    });
  });

  it('fetches profile once per layout mount', async () => {
    renderNavbarLayout('/');

    await waitFor(() => {
      expect(staffApi.getProfileByUserId).toHaveBeenCalledTimes(1);
    });
  });
});
