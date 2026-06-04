export interface Agent {
  _id: string;
  ou_id: string;
  branch_id: string;
  branch_code: string;
  branch_name: string;
  branch_type: string;
  branch_desc?: string;
  parent_branch_id?: string;
  currency: string;
  default_fee_rate: number;
  active: boolean;
  upd_date: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ListAgentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UpdateAgentPayload {
  default_fee_rate: number;
  active?: boolean;
}
