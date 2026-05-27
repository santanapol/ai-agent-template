import axios from 'axios';
import type { TokenResponse } from '../types/auth';

let _accessToken: string | null = null;

/** Mirrors staffApiClient token — set from AuthContext on login/refresh/logout. */
export function setAuthAccessToken(token: string | null): void {
  _accessToken = token;
}

// withCredentials: true — required for the HttpOnly refresh_token cookie to be sent/received
const authClient = axios.create({ withCredentials: true });

authClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

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
