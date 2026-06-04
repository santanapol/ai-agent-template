export interface Invoice {
  _id: string;
  ou_id: string;
  ou_name?: string;
  branch_id: string;
  branch_name?: string;
  iv_no: string;
  billing_month?: string;
  due_date?: string;
  net_win: number;
  amount: number;
  status: string;
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
  ou_name?: string;
  branch_id: string;
  branch_name?: string;
  company_id: string;
  company_name?: string;
  main_category_id: string;
  main_category_name?: string;
  net_win: number;
  fee: number;
  amount: number;
  cr_by?: string;
  cr_prog?: string;
  cr_date: string;
  upd_by?: string;
  upd_prog?: string;
  upd_date?: string;
}

export interface PaginatedResponse<T> {
  status: string;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
