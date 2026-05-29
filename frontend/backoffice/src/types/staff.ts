export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  code: string;
  message: string | null;
  data: T;
  pagination?: Pagination;
  requestId?: string;
}

export interface UserSnippet {
  username: string;
  role: string;
}

export interface StaffProfile {
  id: string;
  user_id: string;
  ou_id: string;
  branch_id: string;
  status: 'active' | 'archived';
  code: string;
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
  user: UserSnippet;
}

export interface CreateProfilePayload {
  code: string;
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
  /** Required when provisioning a new auth user (no `user_id`). */
  username?: string;
  password?: string;
}

export interface ResetProfilePasswordPayload {
  password: string;
  revoke_sessions?: boolean;
}

export interface PatchProfilePayload {
  code?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  tel?: string;
}

export type ProfileStatus = 'active' | 'archived' | 'all';

export interface ListProfilesParams {
  q?: string;
  status?: ProfileStatus;
  branchId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
