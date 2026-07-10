export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

export const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  "Password must include uppercase, lowercase, numbers, and special characters";

/** Helper text shown under password fields before the user submits. */
export const PASSWORD_REQUIREMENTS_DESCRIPTION = `Minimum ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, numbers, and special characters.`;

export const passwordFieldRules = [
  { required: true, message: "Please enter a password" },
  { min: PASSWORD_MIN_LENGTH, message: `Minimum ${PASSWORD_MIN_LENGTH} characters` },
  { max: PASSWORD_MAX_LENGTH, message: `Maximum ${PASSWORD_MAX_LENGTH} characters` },
  {
    pattern: PASSWORD_COMPLEXITY_PATTERN,
    message: PASSWORD_COMPLEXITY_MESSAGE,
  },
];

/** Validates a required password field (create / set-password flows). */
export function validatePassword(value: string | undefined): string | undefined {
  if (!value?.trim()) return "Please enter a password";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (!PASSWORD_COMPLEXITY_PATTERN.test(value)) {
    return PASSWORD_COMPLEXITY_MESSAGE;
  }
  return undefined;
}

export function confirmPasswordRule(getPassword: () => string) {
  return {
    validator(_: unknown, value: string) {
      if (!value || getPassword() === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error("Passwords do not match."));
    },
  };
}

/** Optional field — validates only when user enters a new password (admin reset). */
export const optionalNewPasswordRules = [
  {
    validator(_: unknown, value: string) {
      if (!value) {
        return Promise.resolve();
      }
      if (value.length < PASSWORD_MIN_LENGTH) {
        return Promise.reject(new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`));
      }
      if (value.length > PASSWORD_MAX_LENGTH) {
        return Promise.reject(new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`));
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(value)) {
        return Promise.reject(
          new Error("Password must include uppercase, lowercase, numbers, and special characters."),
        );
      }
      return Promise.resolve();
    },
  },
];

export function optionalConfirmPasswordRule(getNewPassword: () => string) {
  return {
    validator(_: unknown, value: string) {
      const newPassword = getNewPassword();
      if (!newPassword) {
        return Promise.resolve();
      }
      if (!value) {
        return Promise.reject(new Error("Please confirm the password."));
      }
      if (value !== newPassword) {
        return Promise.reject(new Error("Passwords do not match."));
      }
      return Promise.resolve();
    },
  };
}
