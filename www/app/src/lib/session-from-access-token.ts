import type { Session, UserRole } from "../app/auth-context";

const ROLES: readonly UserRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
  "billing",
];

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const parts = accessToken.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid access token");
  }
  const segment = parts[1];
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}

function coerceRole(value: unknown): UserRole {
  if (
    typeof value === "string" &&
    (ROLES as readonly string[]).includes(value)
  ) {
    return value as UserRole;
  }
  return "member";
}

/**
 * Maps Auth access JWT claims to UI session fields (client-side decode only; not verified).
 * Auth service embeds `ou_id`, `branch_id`, and role under `role` by default.
 */
export function sessionFromAccessToken(
  accessToken: string,
): Omit<Session, "accessToken"> {
  const payload = decodeJwtPayload(accessToken);
  const userId = typeof payload.sub === "string" ? payload.sub : "";
  const ouId = typeof payload.ou_id === "string" ? payload.ou_id : "";
  const branchId =
    typeof payload.branch_id === "string" ? payload.branch_id : "";
  const role = coerceRole(payload.role);

  if (!userId || !ouId || !branchId) {
    throw new Error(
      "Access token is missing required claims (sub, ou_id, branch_id).",
    );
  }

  return { userId, ouId, branchId, role };
}
