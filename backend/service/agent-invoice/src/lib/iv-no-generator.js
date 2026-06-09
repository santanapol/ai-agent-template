import { billingYearMonth } from "./date-range.js";

const IV_NO_PATTERN = /^(.+)-(\d{6})-(\d{2})$/;

/**
 * @param {object} params
 * @param {string} params.branchCode
 * @param {string} [params.timezone]
 * @param {string|null} params.latestIvNo
 * @param {string} [params.yyyymm] - explicit YYYYMM (overrides timezone/now)
 * @param {Date} [params.now]
 */
export function nextIvNo({
  branchCode,
  timezone,
  latestIvNo,
  yyyymm,
  now = new Date(),
}) {
  const monthKey = yyyymm ?? billingYearMonth(timezone, now);
  let sequence = 1;

  if (latestIvNo) {
    const match = latestIvNo.match(IV_NO_PATTERN);
    if (match && match[2] === monthKey) {
      sequence = Number.parseInt(match[3], 10) + 1;
    }
  }

  const nn = String(sequence).padStart(2, "0");
  return `${branchCode}-${monthKey}-${nn}`;
}
