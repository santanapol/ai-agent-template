export type InvoiceStatus =
  | 'PENDING'
  | 'VOID'
  | 'CAL'
  | 'MISSING_FEE'
  | 'READY'
  | 'ERROR'
  | 'PAID';

export const INVOICE_STATUSES: InvoiceStatus[] = [
  'PENDING',
  'VOID',
  'CAL',
  'MISSING_FEE',
  'READY',
  'ERROR',
  'PAID',
];

export interface Invoice {
  _id: string;
  ou_id: string;
  ou_name?: string | null;
  branch_id: string;
  branch_name?: string | null;
  iv_no: string;
  billing_month?: string | null;
  due_date?: string | null;
  net_win: number | null;
  bet: number | null;
  amount: number | null;
  status: InvoiceStatus | string;
  cr_by?: string;
  cr_prog?: string;
  cr_date: string;
  upd_by?: string;
  upd_prog?: string;
  upd_date?: string;
}

export interface InvoiceTransaction {
  _id: string;
  ref_iv_id: string;
  ou_id: string;
  ou_name?: string | null;
  branch_id: string;
  branch_name?: string | null;
  company_id: string;
  company_name?: string | null;
  main_category_id: string;
  main_category_name?: string | null;
  net_win: number;
  bet: number;
  fee: number | 'N/A';
  amount: number;
  cr_by?: string;
  cr_prog?: string;
  cr_date: string;
  upd_by?: string;
  upd_prog?: string;
  upd_date?: string;
}

export interface InvoicePagination {
  page: number;
  limit: number;
  total: number | null;
  totalPages: number | null;
  hasMore?: boolean;
}

export interface ListInvoicesData {
  items: Invoice[];
  pagination: InvoicePagination;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  iv_no?: string;
  branch_id?: string;
  billing_month?: string;
  status?: InvoiceStatus | string;
}

export interface GenerateInvoicesPayload {
  month: string;
  branch_id?: string;
}

export interface GenerateInvoicesData {
  generated_count: number;
}

export interface PartialFailureData {
  error_invoice_ids: string[];
  generated_count: number;
}

export interface InvoiceAgentBranch {
  branch_id: string;
  branch_name: string | null;
  branch_code: string | null;
}
