export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
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
