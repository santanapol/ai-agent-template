import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from './apiError';

function makeAxiosError(data: Record<string, unknown> = {}) {
  return Object.assign(new Error('request failed'), {
    isAxiosError: true as const,
    response: { data },
  });
}

describe('apiErrorMessage', () => {
  describe('non-Axios errors', () => {
    it('returns fallback for a plain Error', () => {
      expect(apiErrorMessage(new Error('oops'), 'fallback message')).toBe('fallback message');
    });

    it('returns fallback for a string value', () => {
      expect(apiErrorMessage('string error', 'fallback message')).toBe('fallback message');
    });

    it('returns fallback for null', () => {
      expect(apiErrorMessage(null, 'fallback message')).toBe('fallback message');
    });
  });

  describe('known API error codes', () => {
    it('returns VERSION_CONFLICT message', () => {
      const err = makeAxiosError({ code: 'VERSION_CONFLICT' });
      expect(apiErrorMessage(err, 'fallback')).toBe(
        'This record was modified by another session. Please refresh and try again.',
      );
    });

    it('returns STAFF_AUTH_REVOKE_PENDING message', () => {
      const err = makeAxiosError({ code: 'STAFF_AUTH_REVOKE_PENDING' });
      expect(apiErrorMessage(err, 'fallback')).toBe(
        'Profile archived, but session revocation is still pending.',
      );
    });

    it('returns DUPLICATE message', () => {
      const err = makeAxiosError({ code: 'DUPLICATE' });
      expect(apiErrorMessage(err, 'fallback')).toBe(
        'A profile with this staff code or user already exists.',
      );
    });

    it('prioritises code over message when both present', () => {
      const err = makeAxiosError({ code: 'DUPLICATE', message: 'should be ignored' });
      expect(apiErrorMessage(err, 'fallback')).toBe(
        'A profile with this staff code or user already exists.',
      );
    });
  });

  describe('generic Axios errors', () => {
    it('returns the API message field when no known code is present', () => {
      const err = makeAxiosError({ message: 'Server validation failed' });
      expect(apiErrorMessage(err, 'fallback')).toBe('Server validation failed');
    });

    it('returns fallback when Axios error has no code and no message', () => {
      const err = makeAxiosError({});
      expect(apiErrorMessage(err, 'the fallback')).toBe('the fallback');
    });

    it('returns fallback when Axios error has an unrecognised code and no message', () => {
      const err = makeAxiosError({ code: 'SOME_UNKNOWN_CODE' });
      expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
    });
  });
});
