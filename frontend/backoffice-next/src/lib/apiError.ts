import axios from "axios";

import { BranchReportApiError } from "./branchReportApiClient";

const KNOWN_CODE_MESSAGES: Record<string, string> = {
  VERSION_CONFLICT: "This record was modified by another session. Please refresh and try again.",
  STAFF_AUTH_REVOKE_PENDING: "Profile archived, but session revocation is still pending.",
  DUPLICATE: "A profile with this staff code or user already exists.",
  AUTH_PRECONDITION_FAILED: "This record was modified by another session. Please refresh and try again.",
  AUTH_MENU_NOT_FOUND: "Menu node not found. Refresh the catalog and try again.",
  AUTH_ROLE_PERMISSION_NOT_FOUND: "Role permission mapping not found.",
};

const DETAIL_ALLOWED_CODES = new Set(["AUTH_MENU_IN_USE", "AUTH_ROLE_PERMISSION_IN_USE"]);

const DETAIL_CODE_FALLBACKS: Record<string, string> = {
  AUTH_MENU_IN_USE: "This menu key cannot be deleted because it is still in use.",
  AUTH_ROLE_PERMISSION_IN_USE: "Cannot delete role mapping while active users exist. Confirm to proceed.",
};

/**
 * Extracts a user-friendly error message from an Axios error response.
 * Known API codes map to fixed copy; only allowlisted codes may echo server detail.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof BranchReportApiError) {
    return err.message;
  }

  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code && KNOWN_CODE_MESSAGES[code]) {
      return KNOWN_CODE_MESSAGES[code];
    }
    if (code && DETAIL_ALLOWED_CODES.has(code)) {
      const detail = err.response?.data?.detail as string | undefined;
      return detail ?? DETAIL_CODE_FALLBACKS[code] ?? fallback;
    }
  }
  return fallback;
}
