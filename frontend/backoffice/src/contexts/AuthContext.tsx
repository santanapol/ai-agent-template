import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { DecodedUser, TokenResponse, MenuNode } from '../types/auth';
import * as authApi from '../lib/authApiClient';
import { setAccessToken, setRefreshCallback } from '../lib/baseApiClient';

export interface AuthContextValue {
  user: DecodedUser | null;
  permissions: string[];
  menus: MenuNode[];
  menuLoading: boolean;
  menuError: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): DecodedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload) as DecodedUser;
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DecodedUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((data: TokenResponse) => {
    const decoded = decodeJwt(data.access_token);
    if (!decoded) return;
    setUser(decoded);
    setAccessToken(data.access_token);
    setPermissions(data.permissions || []);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setPermissions([]);
    setMenus([]);
    setMenuLoading(false);
    setMenuError(false);
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
  }, [refreshFn]);

  // On mount: attempt to restore session via HttpOnly refresh cookie.
  // Routed through refreshFn so it shares the in-flight promise with any
  // 401-triggered refresh that fires around the same time (see refreshFn above).
  useEffect(() => {
    refreshFn().finally(() => setLoading(false));
  }, [refreshFn]);

  // Dynamic Menu loading based on user authenticated state
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setMenuLoading(true);
      setMenuError(false);
    });

    authApi
      .getMyMenus()
      .then((data) => {
        if (cancelled) return;
        setMenus(data);
      })
      .catch(() => {
        if (cancelled) return;
        setMenuError(true);
        // Fallback to minimal menus on error
        setMenus([
          { key: 'dashboard', label: 'Dashboard', type: 'action', parent_key: null, sort_order: 0 },
          { key: 'my_profile', label: 'My Profile', type: 'action', parent_key: null, sort_order: 100 },
        ]);
      })
      .finally(() => {
        if (cancelled) return;
        setMenuLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        menus,
        menuLoading,
        menuError,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

