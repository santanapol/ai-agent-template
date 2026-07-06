import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminLayout from './AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import { renderWithProviders } from '../test/renderWithProviders';
import type { DecodedUser } from '../types/auth';
import { useIsMobile } from '../hooks/use-mobile';

function navMainScope() {
  const label = screen.getByText('Menu');
  const group = label.parentElement;
  if (!group) throw new Error('Nav main group not found');
  return within(group);
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

// Mock API clients used in AdminLayout useEffect
vi.mock('../lib/staffApiClient', () => ({
  getProfileByUserId: vi.fn().mockResolvedValue({ profile: { firstname: 'John', lastname: 'Doe', user: { username: 'john_doe' } } }),
}));

vi.mock('../lib/invoicesApiClient', () => ({
  listInvoiceAgents: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../lib/authApiClient', () => ({
  getMyBranch: vi.fn().mockResolvedValue({
    branch_id: 'b1',
    branch_name: 'Branch One',
    branch_code: 'B1',
    active: true,
  }),
}));

vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

describe('AdminLayout component', () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it('renders minimal/fallback menus and Alert banner on menu error', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
        { key: 'my_profile', label: 'My Profile', type: 'action', parent_key: null, sort_order: 100 },
      ],
      menuLoading: false,
      menuError: true,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    // Warning alert is visible
    await waitFor(() => {
      expect(screen.getByText('System warning')).toBeInTheDocument();
      expect(screen.getByText(/Some menu items are temporarily unavailable/)).toBeInTheDocument();
      
      // Fallback menu items (Dashboard) are rendered
      expect(navMainScope().getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.getByLabelText(/account menu for john doe/i)).toBeInTheDocument();
    });
  });

  it('labels the mobile menu trigger', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);

    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(screen.getByLabelText(/open navigation menu/i)).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText(/open navigation menu/i));
    await waitFor(() => {
      expect(screen.getByLabelText(/account menu for john doe/i)).toBeInTheDocument();
    });
  });

  it('hides my_profile from sidebar (profile via header user menu only)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: ['my_profile'],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
        { key: 'my_profile', label: 'My Profile', type: 'action', parent_key: null, sort_order: 80 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(navMainScope().getByText('Dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
  });

  it('filters and displays menu items in sorted tree structure', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        // Out of order in array, should be sorted by sort_order: staff (20) -> billing (30)
        { key: 'billing', label: 'Billing Menu', type: 'menu', parent_key: null, sort_order: 30 },
        { key: 'staff', label: 'Staff Menu', type: 'menu', parent_key: null, sort_order: 20 },
        
        // Children of staff
        { key: 'profiles:list', label: 'Staff Management Item', type: 'action', parent_key: 'staff', sort_order: 10 },
        
        // Children of billing
        { key: 'invoices:list', label: 'Invoices Item', type: 'action', parent_key: 'billing', sort_order: 15 },
        { key: 'agents:list', label: 'Agents Item', type: 'action', parent_key: 'billing', sort_order: 5 }, // agents:list should come before invoices:list
        
        // Dashboard
        { key: 'dashboard', label: 'Dashboard Page', type: 'action', parent_key: null, sort_order: 10 },

        // Unmapped menu item - should be filtered out
        { key: 'unmapped_key', label: 'Unmapped Item', type: 'action', parent_key: null, sort_order: 5 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      // Valid items are rendered
      expect(navMainScope().getByText('Dashboard Page')).toBeInTheDocument();
    });

    // Unmapped item is filtered out
    expect(screen.queryByText('Unmapped Item')).not.toBeInTheDocument();

    // Expand the submenus to make children visible
    const staffMenuHeader = navMainScope().getByText('Staff Menu');
    const billingMenuHeader = navMainScope().getByText('Billing Menu');
    expect(staffMenuHeader).toBeInTheDocument();
    expect(billingMenuHeader).toBeInTheDocument();
    
    fireEvent.click(staffMenuHeader);
    fireEvent.click(billingMenuHeader);

    expect(screen.getByText('Staff Management Item')).toBeInTheDocument();
    expect(screen.getByText('Invoices Item')).toBeInTheDocument();
    expect(screen.getByText('Agents Item')).toBeInTheDocument();
  });

  it('warns when a non-circular menu chain exceeds the depth limit', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        { key: 'dashboard', label: '1', type: 'menu', parent_key: null, sort_order: 1 },
        { key: 'staff', label: '2', type: 'menu', parent_key: 'dashboard', sort_order: 1 },
        { key: 'billing', label: '3', type: 'menu', parent_key: 'staff', sort_order: 1 },
        { key: 'reports', label: '4', type: 'menu', parent_key: 'billing', sort_order: 1 },
        { key: 'settings', label: '5', type: 'menu', parent_key: 'reports', sort_order: 1 },
        { key: 'permissions:manage', label: '6', type: 'menu', parent_key: 'settings', sort_order: 1 },
        { key: 'invoices:list', label: '7', type: 'menu', parent_key: 'permissions:manage', sort_order: 1 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(navMainScope().getByText('1')).toBeInTheDocument();
    });

    expect(warnSpy).toHaveBeenCalledWith('Menu structure exceeded maximum depth or contains a cycle');
    warnSpy.mockRestore();
  });

  it('renders an item with an orphaned parent_key as a top-level item without crashing (T6.11.1)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
        // parent_key references a key that is not present in `menus` at all.
        { key: 'profiles:list', label: 'Orphan Item', type: 'action', parent_key: 'missing_parent', sort_order: 1 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    // No crash: the orphan has no resolvable parent in itemMap, so it
    // falls back to a top-level item alongside Dashboard.
    await waitFor(() => {
      expect(navMainScope().getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Orphan Item')).toBeInTheDocument();
    });
  });

  it('silently drops a circular parent_key chain without crashing or warning (T6.11.2)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'staff', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: [],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
        // A -> B -> A: each node resolves a valid parent in itemMap, so
        // neither becomes a root item and the cycle never reaches sortItems.
        { key: 'staff', label: 'Staff Group', type: 'menu', parent_key: 'billing', sort_order: 1 },
        { key: 'billing', label: 'Billing Group', type: 'menu', parent_key: 'staff', sort_order: 1 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithProviders(<AdminLayout />);

    // No crash, no infinite loop — the rest of the menu still renders.
    await waitFor(() => {
      expect(navMainScope().getByText('Dashboard')).toBeInTheDocument();
    });

    // The cyclic pair is excluded from the tree entirely (not via the
    // depth-guard's warning path — that path is never reached).
    expect(screen.queryByText('Staff Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing Group')).not.toBeInTheDocument();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('renders Settings group with Permissions child when mapped in MENU_UI', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { sub: '123', role: 'platform_admin', branch_id: 'b1' } as unknown as DecodedUser,
      permissions: ['permissions:manage'],
      menus: [
        { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
        { key: 'settings', label: 'Settings', type: 'menu', parent_key: null, sort_order: 90 },
        {
          key: 'permissions:manage',
          label: 'Permissions',
          type: 'action',
          parent_key: 'settings',
          sort_order: 10,
        },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      branchSwitching: false,
      lastBranchSwitchAt: null,
      login: vi.fn(),
      logout: vi.fn(),
      switchBranch: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(navMainScope().getByText('Settings')).toBeInTheDocument();
    });

    fireEvent.click(navMainScope().getByText('Settings'));
    expect(screen.getByText('Permissions')).toBeInTheDocument();
  });
});
