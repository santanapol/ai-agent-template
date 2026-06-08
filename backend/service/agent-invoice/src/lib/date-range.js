import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * @param {string} month - YYYY-MM
 * @returns {boolean}
 */
export function isValidBillingMonth(month) {
  return typeof month === 'string' && MONTH_PATTERN.test(month);
}

/**
 * @param {string} month - YYYY-MM
 * @throws {Error} when format invalid
 */
export function assertValidBillingMonth(month) {
  if (!isValidBillingMonth(month)) {
    throw new Error('INVALID_MONTH');
  }
}

/**
 * Previous calendar month in the given IANA timezone, as UTC Date bounds.
 * @param {string} tz - e.g. Asia/Bangkok
 * @param {Date} [now] - reference instant (for tests)
 */
export function setDate(tz, now = new Date()) {
  const zonedNow = dayjs(now).tz(tz);
  const prevMonth = zonedNow.subtract(1, 'month');
  const startDate = prevMonth.startOf('month').utc().toDate();
  const endDate = prevMonth.endOf('month').utc().toDate();
  return { startDate, endDate };
}

/**
 * YYYYMM for the invoice billing month (previous month in timezone).
 */
export function billingYearMonth(tz, now = new Date()) {
  const zonedNow = dayjs(now).tz(tz);
  return zonedNow.subtract(1, 'month').format('YYYYMM');
}

/**
 * UTC bounds for an explicit billing month in the given timezone.
 * @param {string} month - YYYY-MM
 * @param {string} tz
 */
export function billingPeriodFromMonth(month, tz) {
  assertValidBillingMonth(month);
  const [year, mm] = month.split('-');
  const startDate = dayjs.tz(`${year}-${mm}-01`, tz).startOf('month').utc().toDate();
  const endDate = dayjs.tz(`${year}-${mm}-01`, tz).endOf('month').utc().toDate();
  return { startDate, endDate };
}

/**
 * YYYYMM for an explicit billing month (calendar month, not shifted).
 * @param {string} month - YYYY-MM
 */
export function billingYearMonthFromMonth(month) {
  assertValidBillingMonth(month);
  return month.replace('-', '');
}

/**
 * Calendar month immediately before the reference billing month (YYYY-MM label only).
 * @param {string} referenceMonth - YYYY-MM (invoice cycle label from API body)
 */
export function dataMonthFromReferenceMonth(referenceMonth) {
  assertValidBillingMonth(referenceMonth);
  return dayjs(`${referenceMonth}-01`).subtract(1, 'month').format('YYYY-MM');
}

/**
 * UTC bounds for bet aggregation: previous calendar month of reference `month` in timezone.
 * @param {string} referenceMonth - YYYY-MM
 * @param {string} tz
 */
export function billingDataPeriodFromReferenceMonth(referenceMonth, tz) {
  return billingPeriodFromMonth(dataMonthFromReferenceMonth(referenceMonth), tz);
}

/**
 * Due date string for an invoice cycle: YYYY-MM-15 of the reference month.
 * @param {string} referenceMonth - YYYY-MM
 */
export function dueDateFromReferenceMonth(referenceMonth) {
  assertValidBillingMonth(referenceMonth);
  return `${referenceMonth}-15`;
}
