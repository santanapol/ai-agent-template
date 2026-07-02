import axios from 'axios';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';

/**
 * Auth-specific error messages not covered by apiErrorMessage.
 */
export function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === 'LOGIN_INVALID_CREDENTIALS') return 'Invalid username or password';
    if (code === 'LOGIN_ACCOUNT_LOCKED') return 'Account is locked due to too many failed attempts';
    if (code === 'AUTH_TOO_MANY_ATTEMPTS') return 'Too many attempts. Please try again later.';
    const detail = err.response?.data?.detail as string | undefined;
    if (detail) return detail;
  }
  return 'Login failed. Please try again.';
}

export function passwordChangeFieldErrors(err: unknown): Record<string, string> | null {
  if (!axios.isAxiosError(err)) return null;
  const code = err.response?.data?.code as string | undefined;
  if (code === 'LOGIN_INVALID_CREDENTIALS') {
    return { current_password: 'Current password is incorrect.' };
  }
  if (code === 'AUTH_PASSWORD_UNCHANGED') {
    return { new_password: 'New password must differ from the current password.' };
  }
  if (code === 'AUTH_PASSWORD_POLICY_VIOLATION') {
    return { new_password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  return null;
}
