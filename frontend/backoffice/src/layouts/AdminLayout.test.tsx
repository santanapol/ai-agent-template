import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import type { AuthContextValue } from '../contexts/AuthContext';
import { renderWithProviders } from '../test/renderWithProviders';
import type { DecodedUser } from '../types/auth';

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

describe('AdminLayout component', () => {
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
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    // Warning alert is visible
    await waitFor(() => {
      expect(screen.getByText('System warning')).toBeInTheDocument();
      expect(screen.getByText(/Some menu items are temporarily unavailable/)).toBeInTheDocument();
      
      // Fallback menu items (Dashboard) are rendered
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
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
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      // Valid items are rendered
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    // Unmapped item is filtered out
    expect(screen.queryByText('Unmapped Item')).not.toBeInTheDocument();

    // Expand the submenus to make children visible
    const staffMenuHeader = screen.getByText('Staff Menu');
    const billingMenuHeader = screen.getByText('Billing Menu');
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
        { key: 'my_profile', label: '5', type: 'menu', parent_key: 'reports', sort_order: 1 },
        { key: 'profiles:list', label: '6', type: 'menu', parent_key: 'my_profile', sort_order: 1 },
        { key: 'agents:list', label: '7', type: 'menu', parent_key: 'profiles:list', sort_order: 1 },
      ],
      menuLoading: false,
      menuError: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithProviders(<AdminLayout />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
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
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);

    renderWithProviders(<AdminLayout />);

    // No crash: the orphan has no resolvable parent in itemMap, so it
    // falls back to a top-level item alongside Dashboard.
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
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
      login: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthContextValue);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithProviders(<AdminLayout />);

    // No crash, no infinite loop — the rest of the menu still renders.
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // The cyclic pair is excluded from the tree entirely (not via the
    // depth-guard's warning path — that path is never reached).
    expect(screen.queryByText('Staff Group')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing Group')).not.toBeInTheDocument();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
