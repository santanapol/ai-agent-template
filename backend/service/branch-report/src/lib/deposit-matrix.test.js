import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AMOUNT_BUCKETS,
  accumulateMemberDeposits,
  amountBucketIndex,
  buildDepositMatrix,
  computePercentMatrix,
  createEmptyCountGrid,
  DEPOSIT_MATRIX_ROUNDS,
  roundPercent2,
  roundRatioToPercent,
} from "./deposit-matrix.js";

describe("deposit-matrix helpers", () => {
  it("defines nine amount buckets starting at 0-99 and 21 rounds", () => {
    assert.equal(AMOUNT_BUCKETS.length, 9);
    assert.equal(AMOUNT_BUCKETS[0].key, "0-99");
    assert.equal(AMOUNT_BUCKETS[0].min, 0);
    assert.equal(AMOUNT_BUCKETS[0].max, 99);
    assert.equal(AMOUNT_BUCKETS[8].key, "10000+");
    assert.equal(DEPOSIT_MATRIX_ROUNDS, 21);
  });

  it("defines all nine amount buckets with the correct key/min/max", () => {
    assert.deepEqual(
      AMOUNT_BUCKETS.map((bucket) => ({
        key: bucket.key,
        min: bucket.min,
        max: bucket.max,
      })),
      [
        { key: "0-99", min: 0, max: 99 },
        { key: "100-199", min: 100, max: 199 },
        { key: "200-299", min: 200, max: 299 },
        { key: "300-499", min: 300, max: 499 },
        { key: "500-999", min: 500, max: 999 },
        { key: "1000-2999", min: 1000, max: 2999 },
        { key: "3000-4999", min: 3000, max: 4999 },
        { key: "5000-9999", min: 5000, max: 9999 },
        { key: "10000+", min: 10_000, max: Number.POSITIVE_INFINITY },
      ],
    );
  });

  it("maps amount edges into the correct bucket index", () => {
    assert.equal(amountBucketIndex(0), 0);
    assert.equal(amountBucketIndex(99), 0);
    assert.equal(amountBucketIndex(100), 1);
    assert.equal(amountBucketIndex(199), 1);
    assert.equal(amountBucketIndex(2999), 5);
    assert.equal(amountBucketIndex(3000), 6);
    assert.equal(amountBucketIndex(10000), 8);
    assert.equal(amountBucketIndex(50_000), 8);
  });

  it("maps every adjacent bucket boundary to the correct index", () => {
    assert.equal(amountBucketIndex(199), 1);
    assert.equal(amountBucketIndex(200), 2);
    assert.equal(amountBucketIndex(299), 2);
    assert.equal(amountBucketIndex(300), 3);
    assert.equal(amountBucketIndex(499), 3);
    assert.equal(amountBucketIndex(500), 4);
    assert.equal(amountBucketIndex(999), 4);
    assert.equal(amountBucketIndex(1000), 5);
    assert.equal(amountBucketIndex(4999), 6);
    assert.equal(amountBucketIndex(5000), 7);
    assert.equal(amountBucketIndex(9999), 7);
    assert.equal(amountBucketIndex(10000), 8);
  });

  it("returns null for negative or non-finite amounts", () => {
    assert.equal(amountBucketIndex(-1), null);
    assert.equal(amountBucketIndex(Number.NaN), null);
    assert.equal(amountBucketIndex(Infinity), null);
  });

  it("creates a 9x21 zero count grid", () => {
    const grid = createEmptyCountGrid();
    assert.equal(grid.length, 9);
    assert.equal(grid[0].length, 21);
    assert.equal(
      grid.flat().every((n) => n === 0),
      true,
    );
  });

  it("counts amt 0 in the 0-99 bucket for an existing slot", () => {
    const counts = createEmptyCountGrid();
    accumulateMemberDeposits(counts, [0]);
    assert.equal(counts[0][0], 1);
  });

  it("skips missing deposit slots (does not treat absent rounds as amt 0)", () => {
    const counts = createEmptyCountGrid();
    accumulateMemberDeposits(counts, [50]);
    assert.equal(counts[0][0], 1);
    for (let round = 1; round < DEPOSIT_MATRIX_ROUNDS; round += 1) {
      assert.equal(counts[0][round], 0, `round ${round + 1} must stay empty`);
    }
  });

  it("ignores negative amounts in a slot without throwing", () => {
    const counts = createEmptyCountGrid();
    accumulateMemberDeposits(counts, [-5, 150]);
    assert.equal(counts[0][0], 0);
    assert.equal(counts[1][1], 1);
  });

  it("builds counts, rowSums, percents, and percentRowSums with 2dp half-up rounding", () => {
    // Round 1: two members in 0-99, one in 100-199 → 66.67% / 33.33%
    const matrix = buildDepositMatrix([[50], [50], [150]]);

    assert.equal(matrix.counts[0][0], 2);
    assert.equal(matrix.counts[1][0], 1);
    assert.equal(matrix.rowSums[0], 2);
    assert.equal(matrix.rowSums[1], 1);
    assert.equal(matrix.percents[0][0], 66.67);
    assert.equal(matrix.percents[1][0], 33.33);
    // grandTotal = 3 → percentRowSums
    assert.equal(matrix.percentRowSums[0], 66.67);
    assert.equal(matrix.percentRowSums[1], 33.33);
  });

  it("returns 0 percent when a deposit-round column has no counts", () => {
    const matrix = buildDepositMatrix([[50]]);
    assert.equal(matrix.percents[0][5], 0);
  });

  it("roundPercent2 uses half-up to two decimals", () => {
    assert.equal(roundPercent2(66.666), 66.67);
    assert.equal(roundPercent2(33.333), 33.33);
    assert.equal(roundPercent2(50), 50);
  });

  it("roundRatioToPercent avoids the float-precision misround that roundPercent2((n/d)*100) produces", () => {
    // 23/160 = 14.375 exactly -> half-up must give 14.38, but (23/160)*100
    // is 14.374999999999998 in IEEE-754, which naive rounding misrounds down.
    assert.equal(roundRatioToPercent(23, 160), 14.38);

    const counts = createEmptyCountGrid();
    counts[0][0] = 23;
    counts[1][0] = 137; // column 0 total = 160
    const { percents } = computePercentMatrix(counts);
    assert.equal(percents[0][0], 14.38);
  });

  it("does not rebalance column percents to force an exact 100 sum", () => {
    // Three members split evenly across three buckets in the same round:
    // each cell is 33.33%, and 33.33 * 3 = 99.99, not 100 - no rebalance.
    const matrix = buildDepositMatrix([[50], [150], [250]]);

    assert.equal(matrix.percents[0][0], 33.33);
    assert.equal(matrix.percents[1][0], 33.33);
    assert.equal(matrix.percents[2][0], 33.33);

    const columnSum =
      matrix.percents[0][0] + matrix.percents[1][0] + matrix.percents[2][0];
    assert.notEqual(columnSum, 100);
    assert.equal(Math.round(columnSum * 100) / 100, 99.99);
  });
});
