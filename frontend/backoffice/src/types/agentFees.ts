export interface AgentFee {
  _id: string;
  ou_id: string;
  branch_id: string;
  game_company_id: string;
  game_main_cate_id: string;
  gcomp_cost: number;
  agent_known_fee: number;
  agent_fee: number;
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
  main_cate_name?: { en?: string; th?: string };
  manin_cate_name?: { en?: string; th?: string };
  active?: string;
}

export interface ListFeesParams {
  page?: number;
  limit?: number;
}

export interface CreateFeePayload {
  game_company_id: string;
  game_main_cate_id: string;
  gcomp_cost: number;
  agent_known_fee: number;
  agent_fee: number;
}

export interface UpdateFeePayload {
  gcomp_cost?: number;
  agent_known_fee?: number;
  agent_fee?: number;
}
