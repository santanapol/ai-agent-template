import { AUTH_BASE_URL } from "../config/public-env";

export type NativeLoginResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
};

export async function loginNative(
  username: string,
  password: string,
): Promise<NativeLoginResponse> {
  if (!AUTH_BASE_URL) {
    throw new Error(
      "VITE_AUTH_BASE_URL is not set. Copy .env.example to .env and restart Vite.",
    );
  }

  const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      client_kind: "native",
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
      title?: string;
      code?: string;
    } | null;
    const message =
      (typeof body?.detail === "string" && body.detail) ||
      (typeof body?.title === "string" && body.title) ||
      (typeof body?.code === "string" && body.code) ||
      "Login failed";
    throw new Error(message);
  }

  return response.json() as Promise<NativeLoginResponse>;
}
