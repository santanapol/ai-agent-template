import { describe, expect, it } from 'vitest';
import {
  canSwitchActiveBranch,
  clearCachedInvoiceAgentBranches,
  findInvoiceAgentBranch,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  setCachedInvoiceAgentBranches,
  sortInvoiceAgentBranches,
} from './branchOptions';
import type { InvoiceAgentBranch } from '../types/invoice';

describe('branchOptions', () => {
  it('canSwitchActiveBranch allows OU-wide roles only', () => {
    expect(canSwitchActiveBranch('platform_admin')).toBe(true);
    expect(canSwitchActiveBranch('support_admin')).toBe(true);
    expect(canSwitchActiveBranch('support')).toBe(true);
    expect(canSwitchActiveBranch('branch_admin')).toBe(false);
    expect(canSwitchActiveBranch('staff')).toBe(false);
  });

  it('sortInvoiceAgentBranches puts active branches first', () => {
    const branches: InvoiceAgentBranch[] = [
      { branch_id: '2', branch_name: 'Zeta', branch_code: 'Z', active: false },
      { branch_id: '1', branch_name: 'Alpha', branch_code: 'A', active: true },
    ];
    const sorted = sortInvoiceAgentBranches(branches);
    expect(sorted.map((b) => b.branch_id)).toEqual(['1', '2']);
  });

  it('formatBranchOptionLabel includes inactive suffix', () => {
    expect(
      formatBranchOptionLabel({
        branch_id: '1',
        branch_name: 'North',
        branch_code: 'N01',
        active: false,
      }),
    ).toBe('N01 - North (Inactive)');
  });

  it('findInvoiceAgentBranch returns matching branch', () => {
    const branches: InvoiceAgentBranch[] = [
      { branch_id: 'a', branch_name: 'A', branch_code: 'A01', active: true },
    ];
    expect(findInvoiceAgentBranch(branches, 'a')?.branch_name).toBe('A');
    expect(findInvoiceAgentBranch(branches, 'missing')).toBeUndefined();
  });

  it('caches invoice agent branches per OU', () => {
    clearCachedInvoiceAgentBranches();
    const branches: InvoiceAgentBranch[] = [
      { branch_id: 'a', branch_name: 'A', branch_code: 'A01', active: true },
    ];
    expect(getCachedInvoiceAgentBranches('ou-1')).toBeNull();
    setCachedInvoiceAgentBranches('ou-1', branches);
    expect(getCachedInvoiceAgentBranches('ou-1')).toEqual(branches);
    expect(getCachedInvoiceAgentBranches('ou-2')).toBeNull();
    clearCachedInvoiceAgentBranches();
  });
});
