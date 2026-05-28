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
      return 'Profile was modified by another session. Please refresh and try again.';
    }
    if (code === 'STAFF_AUTH_REVOKE_PENDING') {
      return 'Profile archived, but session revocation is still pending.';
    }
    if (code === 'DUPLICATE') {
      return 'A profile with this staff code or user already exists.';
    }
    const msg = err.response?.data?.message as string | undefined;
    if (msg) return msg;
  }
  return fallback;
}
