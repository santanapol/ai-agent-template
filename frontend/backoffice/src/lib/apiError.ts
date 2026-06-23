import axios from 'axios';

/**
 * Extracts a user-friendly error message from an Axios error response.
 * Checks for known API `code` values first, then falls back to the response
 * `message` field, and finally to the provided `fallback` string.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === 'VERSION_CONFLICT') {
      return 'This record was modified by another session. Please refresh and try again.';
    }
    if (code === 'STAFF_AUTH_REVOKE_PENDING') {
      return 'Profile archived, but session revocation is still pending.';
    }
    if (code === 'DUPLICATE') {
      return 'A profile with this staff code or user already exists.';
    }
    if (code === 'AUTH_PRECONDITION_FAILED') {
      return 'This record was modified by another session. Please refresh and try again.';
    }
    if (code === 'AUTH_MENU_IN_USE') {
      const detail = err.response?.data?.detail as string | undefined;
      return detail ?? 'This menu key cannot be deleted because it is still in use.';
    }
    if (code === 'AUTH_ROLE_PERMISSION_IN_USE') {
      const detail = err.response?.data?.detail as string | undefined;
      return detail ?? 'Cannot delete role mapping while active users exist. Confirm to proceed.';
    }
    if (code === 'AUTH_INVALID_REQUEST') {
      const detail = err.response?.data?.detail as string | undefined;
      if (detail) return detail;
    }
    const detail = err.response?.data?.detail as string | undefined;
    if (detail) return detail;
    const msg = err.response?.data?.message as string | undefined;
    if (msg) return msg;
  }
  return fallback;
}
