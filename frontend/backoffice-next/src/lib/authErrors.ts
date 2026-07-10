import axios from "axios";

import {
  PASSWORD_COMPLEXITY_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_DESCRIPTION,
  validatePassword,
} from "@/lib/passwordPolicy";

/**
 * Auth-specific error messages not covered by apiErrorMessage.
 */
export function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === "LOGIN_INVALID_CREDENTIALS") return "Invalid username or password";
    if (code === "LOGIN_ACCOUNT_LOCKED") return "Account is locked due to too many failed attempts";
    if (code === "AUTH_TOO_MANY_ATTEMPTS") return "Too many attempts. Please try again later.";
  }
  return "Login failed. Please try again.";
}

/** LOGIN-02: API login errors map to form-level alert, not a single field. */
export function loginFieldErrors(err: unknown): { form?: string } {
  return { form: loginErrorMessage(err) };
}

export function passwordChangeFieldErrors(err: unknown): Record<string, string> | null {
  if (!axios.isAxiosError(err)) return null;
  const code = err.response?.data?.code as string | undefined;
  if (code === "LOGIN_INVALID_CREDENTIALS") {
    return { current_password: "Current password is incorrect." };
  }
  if (code === "AUTH_PASSWORD_UNCHANGED") {
    return { new_password: "New password must differ from the current password." };
  }
  if (code === "AUTH_PASSWORD_POLICY_VIOLATION") {
    return { new_password: PASSWORD_COMPLEXITY_MESSAGE };
  }
  return null;
}

/** Maps staff admin password-reset API errors to inline field errors. */
export function staffPasswordResetFieldErrors(
  err: unknown,
): Partial<{ newPassword: string; confirmNewPassword: string }> | null {
  if (!axios.isAxiosError(err)) return null;

  const code = err.response?.data?.code as string | undefined;
  const serverMessage = err.response?.data?.message as string | undefined;

  if (code === "INVALID_PARAM") {
    if (serverMessage === "Password does not meet policy requirements") {
      return { newPassword: PASSWORD_COMPLEXITY_MESSAGE };
    }
    if (serverMessage === "Request validation failed") {
      return { newPassword: PASSWORD_REQUIREMENTS_DESCRIPTION };
    }
    if (serverMessage) {
      return { newPassword: serverMessage };
    }
  }

  return null;
}

export function validateAdminPasswordReset(
  newPassword: string | undefined,
  confirmNewPassword: string | undefined,
): Partial<{ newPassword: string; confirmNewPassword: string }> {
  const errors: Partial<{ newPassword: string; confirmNewPassword: string }> = {};
  const trimmed = newPassword?.trim() ?? "";

  if (!trimmed) {
    errors.newPassword = "Enter a new password to update it.";
    return errors;
  }

  const policyError = validatePassword(trimmed);
  if (policyError) {
    errors.newPassword = policyError;
  }

  if (confirmNewPassword !== trimmed) {
    errors.confirmNewPassword = "Passwords do not match";
  }

  return errors;
}
