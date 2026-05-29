import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  confirmPasswordRule,
  optionalConfirmPasswordRule,
  optionalNewPasswordRules,
} from './passwordPolicy';

describe('passwordPolicy', () => {
  describe('optionalNewPasswordRules', () => {
    const validator = optionalNewPasswordRules[0].validator;

    it('allows empty value (admin reset optional field)', async () => {
      await expect(validator(null, '')).resolves.toBeUndefined();
    });

    it('rejects password shorter than minimum', async () => {
      await expect(validator(null, 'short')).rejects.toThrow(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
    });

    it('rejects password longer than maximum', async () => {
      await expect(validator(null, 'x'.repeat(PASSWORD_MAX_LENGTH + 1))).rejects.toThrow(
        `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
      );
    });

    it('accepts password within policy', async () => {
      await expect(
        validator(null, 'valid-secure-passphrase'),
      ).resolves.toBeUndefined();
    });
  });

  describe('confirmPasswordRule', () => {
    it('rejects when confirm does not match', async () => {
      const rule = confirmPasswordRule(() => 'primary-password-value');
      await expect(rule.validator(null, 'different-value-here')).rejects.toThrow(
        'Passwords do not match.',
      );
    });

    it('accepts when confirm matches', async () => {
      const rule = confirmPasswordRule(() => 'same-password-value!');
      await expect(rule.validator(null, 'same-password-value!')).resolves.toBeUndefined();
    });

    it('resolves when confirm is empty (defers to required rule)', async () => {
      const rule = confirmPasswordRule(() => 'primary-password-value');
      await expect(rule.validator(null, '')).resolves.toBeUndefined();
    });
  });

  describe('optionalConfirmPasswordRule', () => {
    it('skips validation when new password is empty', async () => {
      const rule = optionalConfirmPasswordRule(() => '');
      await expect(rule.validator(null, '')).resolves.toBeUndefined();
    });

    it('requires confirm when new password is set', async () => {
      const rule = optionalConfirmPasswordRule(() => 'new-secure-passphrase');
      await expect(rule.validator(null, '')).rejects.toThrow('Please confirm the password.');
    });

    it('rejects mismatched confirm', async () => {
      const rule = optionalConfirmPasswordRule(() => 'new-secure-passphrase');
      await expect(rule.validator(null, 'other-secure-passphrase')).rejects.toThrow(
        'Passwords do not match.',
      );
    });
  });
});
