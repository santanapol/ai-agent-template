import type { Invoice, InvoiceTransaction } from '../../../types/invoice';

export function makeTestInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    _id: 'inv1',
    ou_id: 'ou1',
    branch_id: 'br1',
    branch_name: 'Vegas Branch',
    iv_no: 'IV-001',
    billing_month: '2026-05',
    due_date: '2026-06-15T00:00:00.000Z',
    net_win: 1000,
    bet: 10000,
    amount: 100,
    status: 'READY',
    cr_date: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeTestTransaction(overrides: Partial<InvoiceTransaction> = {}): InvoiceTransaction {
  return {
    _id: 'txn1',
    ref_iv_id: 'inv1',
    ou_id: 'ou1',
    branch_id: 'br1',
    company_id: 'co1',
    company_name: 'Alpha Gaming',
    main_category_id: 'cat1',
    main_category_name: 'slot_game',
    net_win: 500,
    bet: 5000,
    fee: 10,
    amount: 50,
    cr_date: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}
