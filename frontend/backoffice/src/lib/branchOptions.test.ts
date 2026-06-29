import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canSwitchActiveBranch,
  clearCachedInvoiceAgentBranches,
  findInvoiceAgentBranch,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  isZeroHqBranchId,
  mergePlatformBranches,
  setCachedInvoiceAgentBranches,
  sortInvoiceAgentBranches,
  ZERO_HQ_BRANCH,
  ZERO_HQ_BRANCH_ID,
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

  it('sortInvoiceAgentBranches pins Zero HQ first regardless of sort order', () => {
    const branches: InvoiceAgentBranch[] = [
      { branch_id: ZERO_HQ_BRANCH_ID, branch_name: 'Zero HQ', branch_code: 'ZERO', active: true },
      { branch_id: '2', branch_name: 'Alpha', branch_code: 'A', active: true },
      { branch_id: '1', branch_name: 'Zeta', branch_code: 'Z', active: false },
    ];
    const sorted = sortInvoiceAgentBranches(branches);
    expect(sorted[0]?.branch_id).toBe(ZERO_HQ_BRANCH_ID);
    expect(sorted.map((b) => b.branch_id)).toEqual([ZERO_HQ_BRANCH_ID, '2', '1']);
  });

  it('sortInvoiceAgentBranches preserves inactive Zero HQ from list entry', () => {
    const inactiveHq: InvoiceAgentBranch = {
      branch_id: ZERO_HQ_BRANCH_ID,
      branch_name: 'Zero HQ',
      branch_code: 'ZERO',
      active: false,
    };
    const sorted = sortInvoiceAgentBranches([
      inactiveHq,
      { branch_id: 'a', branch_name: 'Alpha', branch_code: 'A', active: true },
    ]);
    expect(sorted[0]).toEqual(inactiveHq);
    expect(formatBranchOptionLabel(sorted[0]!)).toBe('ZERO - Zero HQ (Inactive)');
  });

  it('ZERO_HQ_BRANCH_ID stays in sync with auth seed constants', () => {
    const authZeroHq = path.resolve(
      fileURLToPath(import.meta.url),
      '../../../../../backend/auth/scripts/seed-data/zero-hq.js',
    );
    const source = readFileSync(authZeroHq, 'utf8');
    const match = source.match(/export const ZERO_HQ_BRANCH_ID = '([a-f0-9]{24})'/);
    expect(match?.[1]).toBe(ZERO_HQ_BRANCH_ID);
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

  it('findInvoiceAgentBranch resolves Zero HQ without gpp lookup', () => {
    expect(findInvoiceAgentBranch([], ZERO_HQ_BRANCH_ID)).toEqual(ZERO_HQ_BRANCH);
    expect(isZeroHqBranchId(ZERO_HQ_BRANCH_ID)).toBe(true);
    expect(formatBranchOptionLabel(ZERO_HQ_BRANCH)).toBe('ZERO - Zero HQ');
  });

  it('findInvoiceAgentBranch prefers list entry over default constant', () => {
    const inactiveHq: InvoiceAgentBranch = {
      branch_id: ZERO_HQ_BRANCH_ID,
      branch_name: 'Zero HQ',
      branch_code: 'ZERO',
      active: false,
    };
    expect(findInvoiceAgentBranch([inactiveHq], ZERO_HQ_BRANCH_ID)).toEqual(inactiveHq);
  });

  it('mergePlatformBranches prepends Zero HQ first in dropdown order', () => {
    const customer: InvoiceAgentBranch[] = [
      { branch_id: 'z', branch_name: 'Zeta', branch_code: 'Z', active: true },
      { branch_id: 'a', branch_name: 'Alpha', branch_code: 'A', active: true },
    ];
    const merged = mergePlatformBranches(customer);
    expect(merged[0]).toEqual(ZERO_HQ_BRANCH);
    expect(merged.map((b) => b.branch_id)).toEqual([ZERO_HQ_BRANCH_ID, 'a', 'z']);
    expect(mergePlatformBranches(merged)).toEqual(merged);
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
