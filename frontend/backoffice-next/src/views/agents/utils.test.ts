import { describe, expect, it } from "vitest";

import { formatAgentBranchTypeLabel, formatAgentCurrency } from "./utils";

describe("formatAgentBranchTypeLabel", () => {
  it("maps known branch types to readable labels", () => {
    expect(formatAgentBranchTypeLabel("MA")).toBe("Master agent");
    expect(formatAgentBranchTypeLabel("AG")).toBe("Agent");
  });

  it("falls back to the raw code for unknown values", () => {
    expect(formatAgentBranchTypeLabel("XX")).toBe("XX");
  });
});

describe("formatAgentCurrency", () => {
  it("uppercases currency codes", () => {
    expect(formatAgentCurrency("thb")).toBe("THB");
  });

  it("returns em dash when currency is missing", () => {
    expect(formatAgentCurrency(null)).toBe("—");
    expect(formatAgentCurrency("  ")).toBe("—");
  });
});
