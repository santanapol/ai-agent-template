import type { Invoice, InvoiceTransaction } from '../types/invoice';

export const mockInvoices: Invoice[] = [
  {
    _id: "6a193d7665ca24eaa8fefcc3",
    ou_id: "5f4fb5bb3156af7a2db9e5a0",
    ou_name: "Bangkok Headquarter",
    branch_id: "5f4f9d57266ed249e45ecef5",
    branch_name: "Sukhumvit Branch",
    iv_no: "7W-202604-01",
    billing_month: "2026-04",
    due_date: "2026-05-05T00:00:00.000Z",
    net_win: 369.25,
    amount: -39.48,
    status: "READY",
    cr_by: "wellington",
    cr_prog: "sum-netwin",
    cr_date: "2026-05-29T14:17:10.231Z",
    upd_by: "wellington",
    upd_prog: "calculate-fee",
    upd_date: "2026-05-29T14:17:10.289Z"
  },
  {
    _id: "6a193d7665ca24eaa8fefcc4",
    ou_id: "5f4fb5bb3156af7a2db9e5a0",
    ou_name: "Bangkok Headquarter",
    branch_id: "5f4f9d57266ed249e45ecef6",
    branch_name: "Silom Branch",
    iv_no: "7W-202604-02",
    billing_month: "2026-04",
    due_date: "2026-05-05T00:00:00.000Z",
    net_win: 1200.50,
    amount: -84.03,
    status: "PAID",
    cr_by: "admin",
    cr_prog: "sum-netwin",
    cr_date: "2026-05-28T09:00:00.000Z",
    upd_date: "2026-05-29T10:15:00.000Z"
  }
];

export const mockInvoiceTransactions: Record<string, InvoiceTransaction[]> = {
  "6a193d7665ca24eaa8fefcc3": [
    {
      _id: "6a193f9365ca24eaa8fefcd2",
      ref_iv_id: "6a193d7665ca24eaa8fefcc3",
      ou_id: "5f4fb5bb3156af7a2db9e5a0",
      ou_name: "Bangkok Headquarter",
      branch_id: "5f4f9d57266ed249e45ecef5",
      branch_name: "Sukhumvit Branch",
      company_id: "5f27e0e88eab0d2e1451893c",
      company_name: "PG Soft",
      main_category_id: "5f157dd40cd3be22cc236a6e",
      main_category_name: "Slot",
      net_win: 300,
      fee: 7,
      amount: -42.85,
      cr_date: "2026-05-29T14:26:11.313Z"
    },
    {
      _id: "6a193f9365ca24eaa8fefcd3",
      ref_iv_id: "6a193d7665ca24eaa8fefcc3",
      ou_id: "5f4fb5bb3156af7a2db9e5a0",
      ou_name: "Bangkok Headquarter",
      branch_id: "5f4f9d57266ed249e45ecef5",
      branch_name: "Sukhumvit Branch",
      company_id: "5f27e0e88eab0d2e1451893d",
      company_name: "JILI",
      main_category_id: "5f157dd40cd3be22cc236a6f",
      main_category_name: "Fish Shooting",
      net_win: 69.25,
      fee: 5,
      amount: -4.32,
      cr_date: "2026-05-29T14:27:00.000Z"
    }
  ]
};
