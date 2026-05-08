const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type SessionHeaders = {
  userId: string;
  ouId: string;
  branchId: string;
  role: string;
};

export async function apiRequest<T>(
  path: string,
  headers: SessionHeaders,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const shouldSetJsonContentType = method === "POST" || method === "PUT" || method === "PATCH";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(shouldSetJsonContentType ? { "content-type": "application/json" } : {}),
      "x-user-id": headers.userId,
      "x-user-ou": headers.ouId,
      "x-user-branch": headers.branchId,
      "x-user-role": headers.role,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.message || errorBody?.code || "Request failed unexpectedly";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
