import { describe, expect, it } from "vitest";

import { ZERO_HQ_BRANCH_ID } from "./branchOptions";
import { resolveBranchScopedEmptyState } from "./branchScopedEmptyState";

describe("resolveBranchScopedEmptyState", () => {
  it("returns Zero HQ guidance for branch-scoped staff on Zero HQ", () => {
    const result = resolveBranchScopedEmptyState({
      activeBranchId: ZERO_HQ_BRANCH_ID,
      resource: "staff",
      scopedToActiveBranch: true,
    });

    expect(result?.emptyTitle).toMatch(/staff profiles at Zero HQ/i);
    expect(result?.emptyDescription).toMatch(/branch switcher/i);
  });

  it("returns null for customer branch", () => {
    expect(
      resolveBranchScopedEmptyState({
        activeBranchId: "5f4fb5bb3156af7a2db9e5a0",
        resource: "staff",
        scopedToActiveBranch: true,
      }),
    ).toBeNull();
  });

  it("returns null when list is not scoped to active branch", () => {
    expect(
      resolveBranchScopedEmptyState({
        activeBranchId: ZERO_HQ_BRANCH_ID,
        resource: "invoices",
        scopedToActiveBranch: false,
      }),
    ).toBeNull();
  });

  it("returns null when rows exist", () => {
    expect(
      resolveBranchScopedEmptyState({
        activeBranchId: ZERO_HQ_BRANCH_ID,
        resource: "staff",
        scopedToActiveBranch: true,
        hasNoRows: false,
      }),
    ).toBeNull();
  });
});
