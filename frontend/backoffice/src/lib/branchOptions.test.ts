import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canSwitchActiveBranch,
  clearCachedInvoiceAgentBranches,
  findInvoiceAgentBranch,
  formatActiveBranchLabel,
  formatBranchDisplayLabel,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  getCachedMyBranch,
  isZeroHqBranchId,
  mergePlatformBranches,
  mergeInvoiceAgentBranches,
  resolveInvoiceFilterBranches,
  setCachedInvoiceAgentBranches,
  setCachedMyBranch,
  sortInvoiceAgentBranches,
  upsertBranchInList,
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

  it('ZERO_HQ_BRANCH_ID stays in sync with auth platform-branches config', () => {
    const authZeroHq = path.resolve(
      fileURLToPath(import.meta.url),
      '../../../../../backend/auth/src/config/platform-branches.js',
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

  it('formatBranchDisplayLabel resolves known branch or falls back while loading', () => {
    const branches: InvoiceAgentBranch[] = [
      { branch_id: 'a', branch_name: '777WW', branch_code: '7W', active: true },
    ];
    expect(formatBranchDisplayLabel(branches, 'a')).toBe('7W - 777WW');
    expect(formatBranchDisplayLabel(branches, 'missing', true)).toBe('…');
    expect(formatBranchDisplayLabel(branches, 'missing')).toBe('missing');
    expect(formatBranchDisplayLabel(branches, ZERO_HQ_BRANCH_ID)).toBe('ZERO - Zero HQ');
  });

  it('formatActiveBranchLabel uses auth branch payload as primary label source', () => {
    const branch: InvoiceAgentBranch = {
      branch_id: '5f4fb5bb3156af7a2db9e5a0',
      branch_name: '777WW',
      branch_code: '7W',
      active: true,
    };
    expect(formatActiveBranchLabel(branch, '5f4fb5bb3156af7a2db9e5a0')).toBe('7W - 777WW');
    expect(formatActiveBranchLabel(null, '5f4fb5bb3156af7a2db9e5a0', true)).toBe('…');
    expect(formatActiveBranchLabel(null, '5f4fb5bb3156af7a2db9e5a0')).toBe('5f4fb5bb3156af7a2db9e5a0');
  });

  it('caches active branch by branch_id', () => {
    clearCachedInvoiceAgentBranches();
    const branch: InvoiceAgentBranch = {
      branch_id: 'a',
      branch_name: 'Alpha',
      branch_code: 'A01',
      active: true,
    };
    expect(getCachedMyBranch('a')).toBeNull();
    setCachedMyBranch(branch);
    expect(getCachedMyBranch('a')).toEqual(branch);
    expect(getCachedMyBranch('b')).toBeNull();
    clearCachedInvoiceAgentBranches();
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

  it('mergeInvoiceAgentBranches adds branches discovered from invoices', () => {
    const agentBranches: InvoiceAgentBranch[] = [
      { branch_id: 'a', branch_name: 'Alpha', branch_code: 'A01', active: true },
    ];
    const merged = mergeInvoiceAgentBranches(agentBranches, [
      { branch_id: 'b', branch_name: 'Beta Branch' },
      { branch_id: 'a', branch_name: 'Alpha' },
    ]);
    expect(merged.map((branch) => branch.branch_id)).toEqual(['a', 'b']);
    expect(merged.find((branch) => branch.branch_id === 'b')?.branch_name).toBe('Beta Branch');
  });

  it('resolveInvoiceFilterBranches prefers fresh API data over cache', () => {
    const cached: InvoiceAgentBranch[] = [
      { branch_id: 'old', branch_name: 'Old', branch_code: 'OLD', active: true },
    ];
    const fresh: InvoiceAgentBranch[] = [
      { branch_id: 'new', branch_name: 'New', branch_code: 'NEW', active: true },
    ];
    const resolved = resolveInvoiceFilterBranches(fresh, [], cached);
    expect(resolved.map((branch) => branch.branch_id)).toEqual(['new']);
  });

  it('resolveInvoiceFilterBranches excludes Zero HQ', () => {
    const resolved = resolveInvoiceFilterBranches(
      [{ branch_id: ZERO_HQ_BRANCH_ID, branch_name: 'Zero HQ', branch_code: 'ZERO', active: true }],
      [],
      null,
    );
    expect(resolved).toEqual([]);
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

  it('upsertBranchInList adds or merges branch rows', () => {
    const initial: InvoiceAgentBranch[] = [
      { branch_id: 'a', branch_name: 'Old', branch_code: 'A01', active: true },
    ];
    const added = upsertBranchInList(initial, {
      branch_id: 'b',
      branch_name: 'Beta',
      branch_code: 'B01',
      active: true,
    });
    expect(added.map((b) => b.branch_id)).toEqual(['a', 'b']);

    const merged = upsertBranchInList(initial, {
      branch_id: 'a',
      branch_name: 'Alpha',
      branch_code: 'A01',
      active: false,
    });
    expect(merged[0]?.branch_name).toBe('Alpha');
    expect(merged[0]?.active).toBe(false);
  });
});
