import { isZeroHqBranchId } from "./branchOptions";

export type BranchScopedResource = "staff" | "invoices";

export interface BranchScopedEmptyState {
  emptyTitle: string;
  emptyDescription: string;
}

const RESOURCE_LABELS: Record<BranchScopedResource, { noun: string; detail: string }> = {
  staff: {
    noun: "staff profiles",
    detail: "Staff profiles are scoped to the active branch.",
  },
  invoices: {
    noun: "invoices",
    detail: "Invoices are scoped to the active branch.",
  },
};

/**
 * When the active branch is Zero HQ and the list is scoped to that branch, show guidance
 * to switch branches instead of a generic empty table message.
 */
export function resolveBranchScopedEmptyState(opts: {
  activeBranchId: string | undefined;
  resource: BranchScopedResource;
  /** True when the list API is filtered to the JWT active branch (not cross-branch). */
  scopedToActiveBranch: boolean;
  /** When false, keep generic empty copy even on Zero HQ (e.g. search/filter miss). */
  hasNoRows?: boolean;
}): BranchScopedEmptyState | null {
  const { activeBranchId, resource, scopedToActiveBranch, hasNoRows = true } = opts;
  if (!hasNoRows || !scopedToActiveBranch || !isZeroHqBranchId(activeBranchId)) {
    return null;
  }

  const labels = RESOURCE_LABELS[resource];
  return {
    emptyTitle: `No ${labels.noun} at Zero HQ`,
    emptyDescription: `Switch to a customer branch using the branch switcher in the sidebar to view ${labels.noun}. ${labels.detail}`,
  };
}
