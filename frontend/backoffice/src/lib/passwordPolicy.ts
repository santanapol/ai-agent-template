export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

export const passwordFieldRules = [
  { required: true, message: 'Please enter a password' },
  { min: PASSWORD_MIN_LENGTH, message: `Minimum ${PASSWORD_MIN_LENGTH} characters` },
  { max: PASSWORD_MAX_LENGTH, message: `Maximum ${PASSWORD_MAX_LENGTH} characters` },
  { 
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, 
    message: 'Password must include uppercase, lowercase, numbers, and special characters' 
  },
];

export function confirmPasswordRule(getPassword: () => string) {
  return {
    validator(_: unknown, value: string) {
      if (!value || getPassword() === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Passwords do not match.'));
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
        return Promise.reject(
          new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
        );
      }
      if (value.length > PASSWORD_MAX_LENGTH) {
        return Promise.reject(
          new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`),
        );
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(value)) {
        return Promise.reject(
          new Error('Password must include uppercase, lowercase, numbers, and special characters.'),
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
        return Promise.reject(new Error('Please confirm the password.'));
      }
      if (value !== newPassword) {
        return Promise.reject(new Error('Passwords do not match.'));
      }
      return Promise.resolve();
    },
  };
}
