import { canSwitchActiveBranchRole } from '@zero-platform/roles';
import type { InvoiceAgentBranch } from '../types/invoice';

export function canSwitchActiveBranch(role: string | undefined): boolean {
  return canSwitchActiveBranchRole(role);
}

function branchLabel(branch: InvoiceAgentBranch): string {
  return `${branch.branch_code ?? ''} ${branch.branch_name ?? ''}`.trim();
}

export function sortInvoiceAgentBranches(branches: InvoiceAgentBranch[]): InvoiceAgentBranch[] {
  return [...branches].sort((a, b) => {
    const aInactive = a.active === false ? 1 : 0;
    const bInactive = b.active === false ? 1 : 0;
    if (aInactive !== bInactive) return aInactive - bInactive;
    return branchLabel(a).localeCompare(branchLabel(b), 'th');
  });
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
  return branches.find((branch) => branch.branch_id === branchId);
}

let cachedBranchesByOu: { ouId: string; branches: InvoiceAgentBranch[] } | null = null;

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

/** @internal test helper */
export function clearCachedInvoiceAgentBranches(): void {
  cachedBranchesByOu = null;
}
