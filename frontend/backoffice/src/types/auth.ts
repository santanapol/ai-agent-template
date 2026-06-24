export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  permissions?: string[]; // permissions might be optional or string[]
}

export interface DecodedUser {
  sub: string;
  role: string;
  ou_id: string;
  branch_id: string;
  token_gen: number;
  exp: number;
  iat: number;
}

export interface MenuNode {
  key: string;
  label: string;
  type: 'menu' | 'action';
  parent_key: string | null;
  sort_order: number;
}
