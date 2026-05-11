function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Auth service base URL (login, refresh, logout). */
export const AUTH_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_AUTH_BASE_URL ?? "",
);

/** API Gateway base URL (Bearer JWT + proxied `/api/v1/*`). */
export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? "",
);
