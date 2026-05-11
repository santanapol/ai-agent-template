import type { UserRole } from "../app/auth-context";
import { API_BASE_URL } from "../config/public-env";

export type SessionHeaders = {
  userId: string;
  ouId: string;
  branchId: string;
  role: string;
  /** When set, sent as `Authorization: Bearer` to the gateway. */
  accessToken?: string | null;
};

export function sessionToApiHeaders(session: {
  userId: string;
  ouId: string;
  branchId: string;
  role: UserRole | string;
  accessToken?: string | null;
}): SessionHeaders {
  return {
    userId: session.userId,
    ouId: session.ouId,
    branchId: session.branchId,
    role: session.role,
    accessToken: session.accessToken ?? null,
  };
}

export async function apiRequest<T>(
  path: string,
  headers: SessionHeaders,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const shouldSetJsonContentType =
    method === "POST" || method === "PUT" || method === "PATCH";
  const bearerToken =
    typeof headers.accessToken === "string" && headers.accessToken.trim() !== ""
      ? headers.accessToken.trim()
      : undefined;

  const requestHeaders: Record<string, string> = {
    "x-user-id": headers.userId,
    "x-user-ou": headers.ouId,
    "x-user-branch": headers.branchId,
    "x-user-role": headers.role,
  };
  if (shouldSetJsonContentType) {
    requestHeaders["content-type"] = "application/json";
  }
  if (bearerToken) {
    requestHeaders.authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...requestHeaders,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string;
      detail?: string;
      title?: string;
      code?: string;
    } | null;
    const detail =
      typeof errorBody?.detail === "string" ? errorBody.detail.trim() : "";
    const code =
      typeof errorBody?.code === "string" ? errorBody.code.trim() : "";
    const message =
      detail && code
        ? `${code}: ${detail}`
        : detail || code || errorBody?.message || errorBody?.title || "Request failed unexpectedly";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
