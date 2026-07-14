import { beforeEach, describe, expect, it } from "vitest";

import {
  clearInvoiceBranchSwitchFilterState,
  shouldApplyInvoiceBranchSwitchFilter,
} from "./branchSwitchSession";

describe("shouldApplyInvoiceBranchSwitchFilter", () => {
  beforeEach(() => {
    clearInvoiceBranchSwitchFilterState();
  });

  it("returns false when lastBranchSwitchAt is null", () => {
    expect(shouldApplyInvoiceBranchSwitchFilter(null)).toBe(false);
  });

  it("returns true once per switch timestamp", () => {
    const ts = 1_700_000_000_000;
    expect(shouldApplyInvoiceBranchSwitchFilter(ts)).toBe(true);
    expect(shouldApplyInvoiceBranchSwitchFilter(ts)).toBe(false);
  });

  it("returns true again for a new switch timestamp", () => {
    expect(shouldApplyInvoiceBranchSwitchFilter(100)).toBe(true);
    expect(shouldApplyInvoiceBranchSwitchFilter(200)).toBe(true);
  });
});
