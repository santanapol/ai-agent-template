import { canSwitchActiveBranchRole } from '@zero-platform/roles';
import type { InvoiceAgentBranch } from '../types/invoice';

/** Sync with auth `scripts/seed-data/zero-hq.js` — platform_branches only, not gpp_777ww. */
export const ZERO_HQ_BRANCH_ID = '6a3000010000000000000001';
export const ZERO_HQ_BRANCH_CODE = 'ZERO';
export const ZERO_HQ_BRANCH_NAME = 'Zero HQ';

export const ZERO_HQ_BRANCH: InvoiceAgentBranch = {
  branch_id: ZERO_HQ_BRANCH_ID,
  branch_code: ZERO_HQ_BRANCH_CODE,
  branch_name: ZERO_HQ_BRANCH_NAME,
  active: true,
};

export function isZeroHqBranchId(branchId: string | undefined): boolean {
  return branchId === ZERO_HQ_BRANCH_ID;
}

export function canSwitchActiveBranch(role: string | undefined): boolean {
  return canSwitchActiveBranchRole(role);
}

function branchLabel(branch: InvoiceAgentBranch): string {
  return `${branch.branch_code ?? ''} ${branch.branch_name ?? ''}`.trim();
}

export function sortInvoiceAgentBranches(branches: InvoiceAgentBranch[]): InvoiceAgentBranch[] {
  const hqEntry = branches.find((branch) => isZeroHqBranchId(branch.branch_id));
  const withoutHq = branches.filter((branch) => !isZeroHqBranchId(branch.branch_id));
  const sortedRest = [...withoutHq].sort((a, b) => {
    const aInactive = a.active === false ? 1 : 0;
    const bInactive = b.active === false ? 1 : 0;
    if (aInactive !== bInactive) return aInactive - bInactive;
    return branchLabel(a).localeCompare(branchLabel(b), 'th');
  });
  return hqEntry ? [hqEntry, ...sortedRest] : sortedRest;
}

export function formatBranchOptionLabel(branch: InvoiceAgentBranch): string {
  const name = branch.branch_name ?? branch.branch_id;
  const prefix = branch.branch_code ? `${branch.branch_code} - ` : '';
  const inactive = branch.active === false ? ' (Inactive)' : '';
  return `${prefix}${name}${inactive}`;
}

export function findInvoiceAgentBranch(
  branches: InvoiceAgentBranch[],
  branchId: string | undefined,
): InvoiceAgentBranch | undefined {
  if (!branchId) return undefined;
  const inList = branches.find((branch) => branch.branch_id === branchId);
  if (inList) return inList;
  if (isZeroHqBranchId(branchId)) return ZERO_HQ_BRANCH;
  return undefined;
}

export function formatBranchDisplayLabel(
  branches: InvoiceAgentBranch[],
  branchId: string | undefined,
  loading = false,
): string {
  if (!branchId) return '—';
  const branch = findInvoiceAgentBranch(branches, branchId);
  if (branch) return formatBranchOptionLabel(branch);
  return loading ? '…' : branchId;
}

/** Header label from GET /auth/me/branch (primary source). */
export function formatActiveBranchLabel(
  branch: InvoiceAgentBranch | null | undefined,
  branchId: string | undefined,
  loading = false,
): string {
  if (!branchId) return '—';
  if (branch?.branch_id === branchId) return formatBranchOptionLabel(branch);
  return loading ? '…' : branchId;
}

/** Inject Zero HQ — lives in zero-platform only, absent from invoice agent list. */
export function mergePlatformBranches(branches: InvoiceAgentBranch[]): InvoiceAgentBranch[] {
  const merged = branches.some((branch) => isZeroHqBranchId(branch.branch_id))
    ? branches
    : [ZERO_HQ_BRANCH, ...branches];
  return sortInvoiceAgentBranches(merged);
}

/** Ensure a branch row exists for header labels and switcher options. */
export function upsertBranchInList(
  branches: InvoiceAgentBranch[],
  branch: InvoiceAgentBranch,
): InvoiceAgentBranch[] {
  const index = branches.findIndex((item) => item.branch_id === branch.branch_id);
  if (index === -1) return [...branches, branch];
  const next = [...branches];
  next[index] = { ...next[index], ...branch };
  return next;
}

let cachedBranchesByOu: { ouId: string; branches: InvoiceAgentBranch[] } | null = null;
let cachedMyBranch: { branchId: string; branch: InvoiceAgentBranch } | null = null;

/** Returns cached active branch when branch_id matches. */
export function getCachedMyBranch(branchId: string | undefined): InvoiceAgentBranch | null {
  if (!branchId || !cachedMyBranch || cachedMyBranch.branchId !== branchId) return null;
  return cachedMyBranch.branch;
}

export function setCachedMyBranch(branch: InvoiceAgentBranch): void {
  cachedMyBranch = { branchId: branch.branch_id, branch };
}

export function clearCachedMyBranch(): void {
  cachedMyBranch = null;
}

/** Returns cached OU branch list when available (avoids refetch on remount). */
export function getCachedInvoiceAgentBranches(
  ouId: string | undefined,
): InvoiceAgentBranch[] | null {
  if (!ouId || !cachedBranchesByOu || cachedBranchesByOu.ouId !== ouId) return null;
  return cachedBranchesByOu.branches;
}

export function setCachedInvoiceAgentBranches(
  ouId: string,
  branches: InvoiceAgentBranch[],
): void {
  cachedBranchesByOu = { ouId, branches };
}

/** @internal test helper — clears module-level branch caches on logout. */
export function clearBranchCaches(): void {
  cachedBranchesByOu = null;
  cachedMyBranch = null;
}

/** @internal test helper */
export function clearCachedInvoiceAgentBranches(): void {
  clearBranchCaches();
}
