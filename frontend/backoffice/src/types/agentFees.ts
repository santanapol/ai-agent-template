export interface AgentFee {
  _id: string;
  agent_id: string;
  ou_id: string;
  branch_id: string;
  company_id: string;
  main_cate_id: string;
  fee_rate: number;
  cr_by: string;
  cr_date: string;
  upd_by: string;
  upd_date: string;
}

export interface GameCompany {
  _id: string;
  ou_id: string;
  name: string;
  provider_name?: { en?: string; th?: string };
  active?: string;
}

export interface GameCategory {
  _id: string;
  ou_id: string;
  name: string;
  manin_cate_name?: { en?: string; th?: string };
  active?: string;
}

export interface ListFeesParams {
  page?: number;
  limit?: number;
}

export interface CreateFeePayload {
  company_id: string;
  main_cate_id: string;
  fee_rate: number;
}

export interface UpdateFeePayload {
  fee_rate: number;
}
