import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/types/invoice';
import {
  buildInvoiceListQuery,
  filterInvoicesBySearch,
  INVOICE_SEARCH_FETCH_LIMIT,
} from './utils';

const sampleInvoices: Invoice[] = [
  {
    _id: '1',
    ou_id: 'ou',
    branch_id: 'branch',
    iv_no: '07BB-202606-02',
    billing_month: '2026-06',
    net_win: 0,
    bet: 0,
    amount: 100,
    status: 'READY',
    cr_date: '2026-06-01T00:00:00.000Z',
  },
  {
    _id: '2',
    ou_id: 'ou',
    branch_id: 'branch',
    iv_no: '07BB-202606-03',
    billing_month: '2026-06',
    net_win: 0,
    bet: 0,
    amount: 200,
    status: 'READY',
    cr_date: '2026-06-02T00:00:00.000Z',
  },
];

describe('buildInvoiceListQuery', () => {
  const base = {
    page: 2,
    limit: 10,
    branchId: 'branch-1',
    billingMonth: '2026-06',
    status: 'READY',
  };

  it('keeps billing_month and pagination when not searching', () => {
    expect(buildInvoiceListQuery(base)).toEqual({
      page: 2,
      limit: 10,
      branch_id: 'branch-1',
      billing_month: '2026-06',
      status: 'READY',
    });
  });

  it('sends branch_id=all when no branch filter is selected', () => {
    expect(buildInvoiceListQuery({ ...base, branchId: undefined }).branch_id).toBe('all');
  });

  it('does not send iv_no and widens fetch window when searching', () => {
    expect(buildInvoiceListQuery({ ...base, ivNo: '07BB' })).toEqual({
      page: 1,
      limit: INVOICE_SEARCH_FETCH_LIMIT,
      branch_id: 'branch-1',
      billing_month: '2026-06',
      status: 'READY',
    });
  });

  it('treats whitespace-only search as not searching', () => {
    expect(buildInvoiceListQuery({ ...base, ivNo: '   ' }).page).toBe(2);
  });
});

describe('filterInvoicesBySearch', () => {
  it('returns all invoices when search is empty', () => {
    expect(filterInvoicesBySearch(sampleInvoices, '')).toEqual(sampleInvoices);
  });

  it('filters by partial invoice number', () => {
    expect(filterInvoicesBySearch(sampleInvoices, '202606-02')).toHaveLength(1);
    expect(filterInvoicesBySearch(sampleInvoices, '202606-02')[0]?.iv_no).toBe('07BB-202606-02');
  });
});
