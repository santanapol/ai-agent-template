import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEmptyMemberMetrics,
  finalizeMemberMetrics,
  padDepositsTo21,
} from "./member-metrics.js";

describe("member-metrics helpers", () => {
  it("pads deposit amounts to 21 slots with trailing zeros", () => {
    assert.deepEqual(
      padDepositsTo21([100, 200, 500]),
      [100, 200, 500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    );
  });

  it("creates empty metrics with promotion 0 and 21 zero deposits", () => {
    const metrics = createEmptyMemberMetrics();
    assert.equal(metrics.billin, 0);
    assert.equal(metrics.withdraw, 0);
    assert.equal(metrics.promotion, 0);
    assert.equal(metrics.revenue, 0);
    assert.equal(metrics.deposits.length, 21);
  });

  it("calculates revenue as billin - withdraw (promotion excluded)", () => {
    const metrics = finalizeMemberMetrics({
      billin: 15000,
      withdraw: 5000,
      promotion: 1200,
      revenue: 0,
      deposits: padDepositsTo21([100, 200, 500]),
    });

    assert.equal(metrics.promotion, 1200);
    assert.equal(metrics.revenue, 10000);
  });
});
