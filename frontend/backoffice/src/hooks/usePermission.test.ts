import { describe, expect, it, vi } from 'vitest';
import { usePermission } from './usePermission';
import { useAuth, AuthContextValue } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('usePermission hook', () => {
  it('returns true if permission matches exact or wildcard', () => {
    vi.mocked(useAuth).mockReturnValue({
      permissions: ['profiles:*', 'invoices:read'],
    } as unknown as AuthContextValue);

    expect(usePermission('profiles:create')).toBe(true);
    expect(usePermission('invoices:read')).toBe(true);
    expect(usePermission('invoices:create')).toBe(false);
  });

  it('returns false if permissions list is empty or undefined', () => {
    vi.mocked(useAuth).mockReturnValue({
      permissions: [],
    } as unknown as AuthContextValue);
    expect(usePermission('profiles:create')).toBe(false);

    vi.mocked(useAuth).mockReturnValue({
      permissions: undefined as unknown as string[],
    } as unknown as AuthContextValue);
    expect(usePermission('profiles:create')).toBe(false);
  });
});
