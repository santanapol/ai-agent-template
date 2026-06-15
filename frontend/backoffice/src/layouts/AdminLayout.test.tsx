import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import AdminLayout from './AdminLayout';
import { useAuth, AuthContextValue } from '../contexts/AuthContext';
import { renderWithProviders } from '../test/renderWithProviders';
import { DecodedUser } from '../types/auth';

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
  it('renders minimal/fallback menus and Alert banner on menu error', () => {
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
    expect(screen.getByText('System warning')).toBeInTheDocument();
    expect(screen.getByText(/Some menu items are temporarily unavailable/)).toBeInTheDocument();
    
    // Fallback menu items (Dashboard) are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('filters and displays menu items in sorted tree structure', () => {
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

    // Unmapped item is filtered out
    expect(screen.queryByText('Unmapped Item')).not.toBeInTheDocument();

    // Valid items are rendered
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    
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
});
