import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  useEffect(() => {
    const refreshFn = async () => {
      try {
        const fresh = await authApi.refresh();
        applyToken(fresh);
        return fresh.access_token;
      } catch {
        clearSession();
        return null;
      }
    };
    setRefreshCallback(refreshFn);
    setAgentRefreshCallback(refreshFn);
    setAgentFeesRefreshCallback(refreshFn);
    setInvoicesRefreshCallback(refreshFn);
  }, [applyToken, clearSession]);

  // On mount: attempt to restore session via HttpOnly refresh cookie
  useEffect(() => {
    authApi
      .refresh()
      .then(applyToken)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applyToken]);

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
