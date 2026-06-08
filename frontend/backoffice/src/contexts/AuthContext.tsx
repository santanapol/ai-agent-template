import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { DecodedUser, TokenResponse } from '../types/auth';
import * as authApi from '../lib/authApiClient';
import { setAccessToken, setRefreshCallback } from '../lib/staffApiClient';
import { setAgentAccessToken, setAgentRefreshCallback } from '../lib/agentsApiClient';
import { setAgentFeesAccessToken, setAgentFeesRefreshCallback } from '../lib/agentFeesApiClient';
import { setInvoicesAccessToken, setInvoicesRefreshCallback } from '../lib/invoicesApiClient';

interface AuthContextValue {
  user: DecodedUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): DecodedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as DecodedUser;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DecodedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((data: TokenResponse) => {
    const decoded = decodeJwt(data.access_token);
    if (!decoded) return;
    setUser(decoded);
    setAccessToken(data.access_token);
    setAgentAccessToken(data.access_token);
    setAgentFeesAccessToken(data.access_token);
    setInvoicesAccessToken(data.access_token);
    authApi.setAuthAccessToken(data.access_token);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAgentAccessToken(null);
    setAgentFeesAccessToken(null);
    setInvoicesAccessToken(null);
    authApi.setAuthAccessToken(null);
  }, []);

  // Register the refresh callback so staffApiClient and agentsApiClient can retry on 401
  // Each API client carries its own 401-retry interceptor, so a single navigation can
  // trigger several of them concurrently. The refresh-token cookie is single-use and
  // rotates on every call, so firing more than one `/auth/refresh` at once causes all
  // but the first to be rejected (and can force an unwanted logout). Share one in-flight
  // promise across all callers so concurrent 401s wait on the same refresh.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const refreshFn = useCallback(() => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = authApi
        .refresh()
        .then((fresh) => {
          applyToken(fresh);
          return fresh.access_token;
        })
        .catch(() => {
          clearSession();
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }
    return refreshPromiseRef.current;
  }, [applyToken, clearSession]);

  useEffect(() => {
    setRefreshCallback(refreshFn);
    setAgentRefreshCallback(refreshFn);
    setAgentFeesRefreshCallback(refreshFn);
    setInvoicesRefreshCallback(refreshFn);
  }, [refreshFn]);

  // On mount: attempt to restore session via HttpOnly refresh cookie.
  // Routed through refreshFn so it shares the in-flight promise with any
  // 401-triggered refresh that fires around the same time (see refreshFn above).
  useEffect(() => {
    refreshFn().finally(() => setLoading(false));
  }, [refreshFn]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await authApi.login(username, password);
      applyToken(data);
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort
    }
    clearSession();
  }, [clearSession]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
