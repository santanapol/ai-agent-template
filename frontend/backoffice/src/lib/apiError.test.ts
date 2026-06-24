import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import { apiErrorMessage } from './apiError';

function makeAxiosError(data: { code?: string; detail?: string; message?: string }) {
  const err = new Error('request failed') as AxiosError;
  err.isAxiosError = true;
  err.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  } as AxiosError['response'];
  return err;
}

describe('apiErrorMessage', () => {
  it('maps AUTH_PRECONDITION_FAILED', () => {
    const err = makeAxiosError({ code: 'AUTH_PRECONDITION_FAILED' });
    expect(apiErrorMessage(err, 'fallback')).toMatch(/modified by another session/i);
  });

  it('maps AUTH_MENU_IN_USE from detail', () => {
    const err = makeAxiosError({
      code: 'AUTH_MENU_IN_USE',
      detail: 'Cannot delete menu key that has children.',
    });
    expect(apiErrorMessage(err, 'fallback')).toBe('Cannot delete menu key that has children.');
  });

  it('maps AUTH_ROLE_PERMISSION_IN_USE from detail', () => {
    const err = makeAxiosError({
      code: 'AUTH_ROLE_PERMISSION_IN_USE',
      detail: 'Cannot delete role mapping because there are 3 active users.',
    });
    expect(apiErrorMessage(err, 'fallback')).toContain('active users');
  });

  it('maps AUTH_INVALID_REQUEST from detail string', () => {
    const err = makeAxiosError({
      code: 'AUTH_INVALID_REQUEST',
      detail: 'Menu validation failed: duplicate key',
    });
    expect(apiErrorMessage(err, 'fallback')).toBe('Menu validation failed: duplicate key');
  });

  it('still maps VERSION_CONFLICT for staff', () => {
    const err = makeAxiosError({ code: 'VERSION_CONFLICT' });
    expect(apiErrorMessage(err, 'fallback')).toMatch(/modified by another session/i);
  });

  it('returns fallback for unknown errors', () => {
    expect(apiErrorMessage(new Error('nope'), 'fallback')).toBe('fallback');
  });

  it('maps AUTH_MENU_NOT_FOUND', () => {
    const err = makeAxiosError({
      code: 'AUTH_MENU_NOT_FOUND',
      detail: 'Menu key missing',
    });
    expect(apiErrorMessage(err, 'fallback')).toBe('Menu key missing');
  });

  it('maps AUTH_ROLE_PERMISSION_NOT_FOUND with default message', () => {
    const err = makeAxiosError({ code: 'AUTH_ROLE_PERMISSION_NOT_FOUND' });
    expect(apiErrorMessage(err, 'fallback')).toBe('Role permission mapping not found.');
  });
});
