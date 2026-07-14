import { DEPOSIT_SLOT_COUNT } from "./member-metrics.js";

/** @typedef {{ key: string; label: string; min: number; max: number }} AmountBucket */

export const DEPOSIT_MATRIX_ROUNDS = DEPOSIT_SLOT_COUNT;

/** @type {AmountBucket[]} */
export const AMOUNT_BUCKETS = [
  { key: "0-99", label: "0 - 99", min: 0, max: 99 },
  { key: "100-199", label: "100 - 199", min: 100, max: 199 },
  { key: "200-299", label: "200 - 299", min: 200, max: 299 },
  { key: "300-499", label: "300 - 499", min: 300, max: 499 },
  { key: "500-999", label: "500 - 999", min: 500, max: 999 },
  { key: "1000-2999", label: "1,000 - 2,999", min: 1000, max: 2999 },
  { key: "3000-4999", label: "3,000 - 4,999", min: 3000, max: 4999 },
  { key: "5000-9999", label: "5,000 - 9,999", min: 5000, max: 9999 },
  {
    key: "10000+",
    label: "10,000 +",
    min: 10_000,
    max: Number.POSITIVE_INFINITY,
  },
];

/**
 * @param {number} amt
 * @returns {number | null}
 */
export function amountBucketIndex(amt) {
  const n = Number(amt);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }

  for (let index = 0; index < AMOUNT_BUCKETS.length; index += 1) {
    const bucket = AMOUNT_BUCKETS[index];
    if (n >= bucket.min && n <= bucket.max) {
      return index;
    }
  }

  return null;
}

/** @returns {number[][]} */
export function createEmptyCountGrid() {
  return AMOUNT_BUCKETS.map(() => Array(DEPOSIT_MATRIX_ROUNDS).fill(0));
}

/**
 * Increment counts from a member's raw deposit slot amounts (unpadded).
 * Missing trailing slots are not treated as amt 0.
 *
 * @param {number[][]} counts
 * @param {number[]} deposits
 */
export function accumulateMemberDeposits(counts, deposits) {
  const limit = Math.min(deposits.length, DEPOSIT_MATRIX_ROUNDS);

  for (let round = 0; round < limit; round += 1) {
    const bucketIndex = amountBucketIndex(deposits[round]);
    if (bucketIndex === null) {
      continue;
    }
    counts[bucketIndex][round] += 1;
  }
}

/**
 * @param {number} value
 * @returns {number}
 */
export function roundPercent2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Half-up round of (numerator/denominator)*100 to 2 decimals, computed from
 * the integer ratio in a single rounding step. Avoids feeding an
 * already-imprecise float percentage back through another *100 multiply,
 * which can misround exact ties (e.g. 23/160 = 14.375 -> must round to
 * 14.38, but (23/160)*100 is 14.374999999999998 in IEEE-754).
 *
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number}
 */
export function roundRatioToPercent(numerator, denominator) {
  return Math.round((numerator * 10000) / denominator) / 100;
}

/**
 * @param {number[][]} counts
 * @returns {{
 *   rowSums: number[];
 *   percents: number[][];
 *   percentRowSums: number[];
 * }}
 */
export function computePercentMatrix(counts) {
  const rowSums = counts.map((row) => row.reduce((sum, n) => sum + n, 0));
  const grandTotal = rowSums.reduce((sum, n) => sum + n, 0);

  const columnTotals = Array(DEPOSIT_MATRIX_ROUNDS).fill(0);
  for (const row of counts) {
    for (let round = 0; round < DEPOSIT_MATRIX_ROUNDS; round += 1) {
      columnTotals[round] += row[round];
    }
  }

  const percents = counts.map((row) =>
    row.map((cell, round) => {
      const denom = columnTotals[round];
      if (denom <= 0) {
        return 0;
      }
      return roundRatioToPercent(cell, denom);
    }),
  );

  const percentRowSums = rowSums.map((rowSum) => {
    if (grandTotal <= 0) {
      return 0;
    }
    return roundRatioToPercent(rowSum, grandTotal);
  });

  return { rowSums, percents, percentRowSums };
}

/**
 * @param {number[][]} memberDepositLists
 * @returns {{
 *   buckets: AmountBucket[];
 *   rounds: number;
 *   counts: number[][];
 *   rowSums: number[];
 *   percents: number[][];
 *   percentRowSums: number[];
 * }}
 */
export function buildDepositMatrix(memberDepositLists) {
  const counts = createEmptyCountGrid();

  for (const deposits of memberDepositLists) {
    accumulateMemberDeposits(counts, deposits);
  }

  const { rowSums, percents, percentRowSums } = computePercentMatrix(counts);

  return {
    buckets: AMOUNT_BUCKETS,
    rounds: DEPOSIT_MATRIX_ROUNDS,
    counts,
    rowSums,
    percents,
    percentRowSums,
  };
}
