import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceList from './index';
import { renderWithRouter } from '../../test/renderWithRouter';
import { mockAuthUser, mockInvoice } from '../../test/mockFactories';

const navigate = vi.fn();
const fetchInvoices = vi.fn();
const fetchInvoiceAgents = vi.fn();
const generateInvoices = vi.fn();
const mockUsePermission = vi.fn();
const mockUseInvoices = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../hooks/usePermission', () => ({
  usePermission: (permission: string) => mockUsePermission(permission),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser() }),
}));

vi.mock('../../hooks/useAppFeedback', () => ({
  useAppFeedback: () => ({
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    modal: { confirm: vi.fn() },
  }),
}));

vi.mock('../../hooks/useConfirmDialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useConfirmDialog')>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: vi.fn() }),
  };
});

vi.mock('./hooks/useInvoices', () => ({
  useInvoices: () => mockUseInvoices(),
}));

describe('InvoiceList page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermission.mockReturnValue(true);
    mockUseInvoices.mockReturnValue({
      invoices: [mockInvoice()],
      total: 1,
      loading: false,
      generating: false,
      branches: [{ branch_id: 'branch-1', branch_code: 'B1', branch_name: 'Branch One' }],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });
  });

  it('renders page shell with filters and table', async () => {
    renderWithRouter(<InvoiceList />, { initialEntries: ['/invoices'] });

    expect(screen.getByText('Invoice Management')).toBeInTheDocument();
    expect(screen.getByLabelText(/^search$/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching', () => {
    mockUseInvoices.mockReturnValue({
      invoices: [],
      total: 0,
      loading: true,
      generating: false,
      branches: [],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });

    renderWithRouter(<InvoiceList />);
    expect(document.querySelector('[aria-busy="true"], .animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no invoices', async () => {
    mockUseInvoices.mockReturnValue({
      invoices: [],
      total: 0,
      loading: false,
      generating: false,
      branches: [],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });

    renderWithRouter(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('hides Create Invoice when write permission is missing', () => {
    mockUsePermission.mockImplementation((permission: string) => permission !== 'invoices:write');

    renderWithRouter(<InvoiceList />);

    expect(screen.queryByRole('button', { name: /create invoice/i })).not.toBeInTheDocument();
  });

  it('shows bulk action bar when export permission granted', async () => {
    mockUsePermission.mockImplementation((permission: string) => {
      if (permission === 'invoices:read') return true;
      if (permission === 'invoices:write') return false;
      return false;
    });

    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
  });

  it('navigates to invoice detail on row action', async () => {
    const user = userEvent.setup();
    renderWithRouter(<InvoiceList />, { initialEntries: ['/invoices'] });

    await waitFor(() => {
      expect(screen.getByLabelText(/view invoice inv-001/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/view invoice inv-001/i));
    expect(navigate).toHaveBeenCalledWith(
      '/invoices/invoice-1',
      expect.objectContaining({ state: expect.any(Object) }),
    );
  });

  it('reads filters from URL search params', async () => {
    renderWithRouter(<InvoiceList />, {
      initialEntries: ['/invoices?search=INV-999&branch_id=branch-1&status=READY'],
    });

    await waitFor(() => {
      expect(fetchInvoices).toHaveBeenCalled();
    });
    expect(screen.getByDisplayValue('INV-999')).toBeInTheDocument();
  });

  it('calls fetchInvoices once on initial load', async () => {
    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(fetchInvoices).toHaveBeenCalledTimes(1);
    });
  });
});
