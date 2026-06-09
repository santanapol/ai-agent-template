import type { TokenResponse } from '../types/auth';
import { baseClient as authClient } from './baseApiClient';

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>('/auth/login', {
    username,
    password,
    client_kind: 'web',
  });
  return res.data;
}

export async function refresh(): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>('/auth/refresh', {});
  return res.data;
}

export async function logout(): Promise<void> {
  await authClient.post('/auth/logout', {});
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await authClient.post('/auth/me/password', payload);
}
