import { isValidObjectId } from '../../lib/object-id.js';

import { isInvoiceStatus } from './invoice-status.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

const BILLING_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Normalize optional querystring (all params optional).
 * Empty / missing values are ignored; page & limit default to 1 and 20.
 *
 * @param {Record<string, unknown>} [query]
 */
export function parseListInvoicesQuery(query = {}) {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const limit = parsePositiveInt(query.limit, DEFAULT_LIMIT);

  const ivNo = pickNonEmptyString(query.iv_no);
  const branchId = pickNonEmptyString(query.branch_id);
  const billingMonth = pickNonEmptyString(query.billing_month);
  const status = pickNonEmptyString(query.status);

  return { page, limit, ivNo, branchId, billingMonth, status };
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return n;
}

/**
 * @param {unknown} value
 */
function pickNonEmptyString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * @param {ReturnType<typeof parseListInvoicesQuery>} parsed
 */
export function validateListInvoicesQuery(parsed) {
  const { page, limit, branchId, billingMonth, status } = parsed;

  if (!Number.isFinite(page) || page < 1 || !Number.isFinite(limit) || limit < 1) {
    return { ok: false, code: 'INVALID_PARAM' };
  }

  if (limit > MAX_LIMIT) {
    return { ok: false, code: 'INVALID_PARAM' };
  }

  if (branchId && !isValidObjectId(branchId)) {
    return { ok: false, code: 'INVALID_PARAM' };
  }

  if (status && !isInvoiceStatus(status)) {
    return { ok: false, code: 'INVALID_PARAM' };
  }

  if (billingMonth && !BILLING_MONTH_PATTERN.test(billingMonth)) {
    return { ok: false, code: 'INVALID_PARAM' };
  }

  return { ok: true };
}
