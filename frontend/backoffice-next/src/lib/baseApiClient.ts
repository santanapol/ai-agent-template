import axios, { type AxiosResponse } from "axios";

let _accessToken: string | null = null;
let _refreshCallback: (() => Promise<string | null>) | null = null;

export const baseClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export function setAccessToken(token: string | null): void {
  _accessToken = token;
  if (token) {
    baseClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete baseClient.defaults.headers.common.Authorization;
  }
}

export function setRefreshCallback(fn: (() => Promise<string | null>) | null): void {
  _refreshCallback = fn;
}

baseClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

baseClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as typeof err.config & { _retry?: boolean };
    if (
      err.response?.status === 401 &&
      !original._retry &&
      _refreshCallback &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/me/menus")
    ) {
      original._retry = true;
      const newToken = await _refreshCallback();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return baseClient(original);
      }
    }
    return Promise.reject(err);
  },
);

export function extractETag(res: AxiosResponse): string | null {
  const raw = res.headers.etag;
  return typeof raw === "string" ? raw : null;
}
