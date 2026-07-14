export const DEPOSIT_COLLECTION = "dm_dm_tn_deposit";
export const WITHDRAW_COLLECTION = "wallet_withdraw";
export const PROMOTION_COLLECTION = "promotion_receive";
export const DEPOSIT_SLOT_COUNT = 21;

/**
 * @returns {{
 *   billin: number;
 *   withdraw: number;
 *   promotion: number;
 *   revenue: number;
 *   deposits: number[];
 * }}
 */
export function createEmptyMemberMetrics() {
  return {
    billin: 0,
    withdraw: 0,
    promotion: 0,
    revenue: 0,
    deposits: Array(DEPOSIT_SLOT_COUNT).fill(0),
  };
}

/**
 * @param {number[]} amounts
 * @returns {number[]}
 */
export function padDepositsTo21(amounts) {
  const deposits = Array(DEPOSIT_SLOT_COUNT).fill(0);
  const limit = Math.min(amounts.length, DEPOSIT_SLOT_COUNT);

  for (let index = 0; index < limit; index += 1) {
    deposits[index] = Number(amounts[index] ?? 0);
  }

  return deposits;
}

/**
 * @param {{
 *   billin: number;
 *   withdraw: number;
 *   promotion: number;
 *   revenue: number;
 *   deposits: number[];
 * }} metrics
 */
export function finalizeMemberMetrics(metrics) {
  metrics.promotion = Number(metrics.promotion ?? 0);
  metrics.revenue = metrics.billin - metrics.withdraw;
  return metrics;
}

/**
 * @param {import('mongodb').ObjectId[]} memIds
 * @returns {Map<string, ReturnType<typeof createEmptyMemberMetrics>>}
 */
export function createMetricsMap(memIds) {
  const map = new Map();

  for (const memId of memIds) {
    map.set(memId.toString(), createEmptyMemberMetrics());
  }

  return map;
}
