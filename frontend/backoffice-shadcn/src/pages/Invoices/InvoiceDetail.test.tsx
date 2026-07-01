import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';

const navigate = vi.fn();
const confirm = vi.fn();
const fetchInvoiceDetail = vi.fn();
const fetchTransactions = vi.fn();
const markAsPaid = vi.fn().mockResolvedValue(true);
const cancelInvoice = vi.fn().mockResolvedValue(true);

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: 'invoice-1' }),
}));

vi.mock('@/hooks/useConfirmDialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useConfirmDialog')>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm }),
  };
});

vi.mock('./hooks/useInvoices', () => ({
  useInvoices: () => ({
    invoice: {
      _id: 'invoice-1',
      iv_no: 'INV-001',
      status: 'READY',
      amount: 1234,
      billing_month: '2026-07',
      cr_date: '2026-07-01',
      due_date: '2026-07-15',
      branch_name: 'Branch One',
      upd_date: '2026-07-01',
    },
    transactions: [],
    detailLoading: false,
    transactionsLoading: false,
    updatingStatus: false,
    fetchInvoiceDetail,
    fetchTransactions,
    markAsPaid,
    cancelInvoice,
  }),
}));

import InvoiceDetail from './InvoiceDetail';

describe('InvoiceDetail', () => {
  beforeEach(() => {
    confirm.mockClear();
    fetchInvoiceDetail.mockClear();
    fetchTransactions.mockClear();
    markAsPaid.mockClear();
    cancelInvoice.mockClear();
  });

  it('confirms before marking an invoice as paid', async () => {
    const user = userEvent.setup();

    renderWithProviders(<InvoiceDetail />);

    await user.click(screen.getByRole('button', { name: /mark as paid/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mark as PAID',
        okText: 'Mark as PAID',
      }),
    );

    await confirm.mock.calls[0][0].onOk();
    expect(markAsPaid).toHaveBeenCalledWith('invoice-1');
    expect(fetchInvoiceDetail).toHaveBeenCalledWith('invoice-1');
  });

  it('confirms before canceling an invoice', async () => {
    const user = userEvent.setup();

    renderWithProviders(<InvoiceDetail />);

    await user.click(screen.getByRole('button', { name: /cancel invoice/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel Invoice',
        danger: true,
        okText: 'Cancel Invoice',
      }),
    );

    await confirm.mock.calls[0][0].onOk();
    expect(cancelInvoice).toHaveBeenCalledWith('invoice-1');
    expect(fetchInvoiceDetail).toHaveBeenCalledWith('invoice-1');
  });
});
