"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";

import * as authApi from "../lib/authApiClient";
import { setAccessToken, setRefreshCallback } from "../lib/baseApiClient";
import { clearBranchCaches } from "../lib/branchOptions";
import type { DecodedUser, MenuNode, TokenResponse } from "../types/auth";

export interface AuthContextValue {
  user: DecodedUser | null;
  permissions: string[];
  menus: MenuNode[];
  menuLoading: boolean;
  menuError: boolean;
  loading: boolean;
  branchSwitching: boolean;
  /** Timestamp of last successful active-branch switch (for page reset UX). */
  lastBranchSwitchAt: number | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): DecodedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    const decoded = JSON.parse(jsonPayload) as DecodedUser & { token_gen?: unknown };
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    const rawGen = decoded.token_gen;
    const tokenGen = rawGen === undefined || rawGen === null ? 0 : Number(rawGen);
    if (!Number.isInteger(tokenGen) || tokenGen < 0) return null;
    return { ...decoded, token_gen: tokenGen };
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
  const [branchSwitching, setBranchSwitching] = useState(false);
  const [lastBranchSwitchAt, setLastBranchSwitchAt] = useState<number | null>(null);

  const applyToken = useCallback((data: TokenResponse) => {
    const decoded = decodeJwt(data.access_token);
    if (!decoded) return;
    setUser(decoded);
    setAccessToken(data.access_token);
    setPermissions(data.permissions ?? []);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setPermissions([]);
    setMenus([]);
    setMenuLoading(false);
    setMenuError(false);
    clearBranchCaches();
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

  const permissionsKey = useMemo(() => [...permissions].sort().join("\u0001"), [permissions]);

  // Load menus when session or effective permissions change. Use a stable permissionsKey
  // (not the array reference) so identical permission sets do not refetch menus.
  // biome-ignore lint/correctness/useExhaustiveDependencies: permissionsKey intentionally triggers refetch when permissions change
  useEffect(() => {
    if (!user?.sub) return;

    let cancelled = false;

    /* eslint-disable react-hooks/set-state-in-effect --
     * Intentional: synchronously set loading/error flags before the async
     * API call so the UI reflects the pending state immediately (not after
     * the microtask queue drains). Both setState calls are unconditional and
     * do not depend on component state, so they don't cause cascading renders.
     */
    setMenuLoading(true);
    setMenuError(false);
    /* eslint-enable react-hooks/set-state-in-effect */

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
          { key: "dashboard", label: "Dashboard", type: "action", parent_key: null, sort_order: 0 },
          { key: "my_profile", label: "My Profile", type: "action", parent_key: null, sort_order: 100 },
        ]);
      })
      .finally(() => {
        if (cancelled) return;
        setMenuLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // permissionsKey refetches menus when the effective permission set changes.
  }, [user?.sub, permissionsKey]);

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

  const switchBranch = useCallback(
    async (branchId: string) => {
      setBranchSwitching(true);
      try {
        const data = await authApi.switchActiveBranch(branchId);
        applyToken(data);
        setLastBranchSwitchAt(Date.now());
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.code === "AUTH_NOT_READY") {
          await authApi.refresh();
          const data = await authApi.switchActiveBranch(branchId);
          applyToken(data);
          setLastBranchSwitchAt(Date.now());
          return;
        }
        throw err;
      } finally {
        setBranchSwitching(false);
      }
    },
    [applyToken],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        menus,
        menuLoading,
        menuError,
        loading,
        branchSwitching,
        lastBranchSwitchAt,
        login,
        logout,
        switchBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
