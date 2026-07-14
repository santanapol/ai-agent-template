import { describe, expect, it } from "vitest";

import { formatDeposit, formatPromotion, formatSummary } from "./royalty21Formatters";

describe("royalty21Formatters", () => {
  it("formatSummary uses 2 decimal places", () => {
    expect(formatSummary(100)).toBe("100.00");
    expect(formatSummary(1234.5)).toBe("1,234.50");
  });

  it("formatDeposit shows dash for zero", () => {
    expect(formatDeposit(0)).toBe("-");
    expect(formatDeposit(10)).toBe("10.00");
  });

  it("formatPromotion formats summary amounts", () => {
    expect(formatPromotion(0)).toBe("0.00");
    expect(formatPromotion(1200)).toBe("1,200.00");
  });
});
