import { canSwitchActiveBranchRole } from "@zero-platform/roles";
import { isValidObjectId } from "../../lib/object-id.js";

import { isInvoiceStatus } from "./invoice-status.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Querystring sentinel: list invoices across all branches (no branch_id filter). */
export const ALL_BRANCHES_QUERY = "all";

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
  const rawBranchId = pickNonEmptyString(query.branch_id);
  const branchId = rawBranchId === ALL_BRANCHES_QUERY ? undefined : rawBranchId;
  const billingMonth = pickNonEmptyString(query.billing_month);
  const status = pickNonEmptyString(query.status);

  return { page, limit, ivNo, branchId, billingMonth, status };
}

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const n = typeof value === "number" ? value : Number(value);
  return n;
}

/**
 * @param {unknown} value
 */
function pickNonEmptyString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Normalize branch_id from querystring (ignores non-string / array values).
 * @param {unknown} value
 */
export function normalizeBranchIdQuery(value) {
  return pickNonEmptyString(value);
}

/**
 * Resolve list query branch scope from role + active branch + optional query override.
 * @param {{ rawBranchId?: string, role?: string, activeBranchId?: string }} params
 * @returns {string | undefined} branchId for downstream parse (undefined = all branches)
 */
export function resolveInvoiceBranchScope({
  rawBranchId,
  role,
  activeBranchId,
}) {
  if (!canSwitchActiveBranchRole(role)) {
    return activeBranchId;
  }
  if (!rawBranchId || rawBranchId === ALL_BRANCHES_QUERY) {
    return undefined;
  }
  return rawBranchId;
}

/**
 * Build the query object passed to listInvoices from raw request query + user context.
 * @param {Record<string, unknown>} rawQuery
 * @param {{ role?: string, activeBranchId?: string }} userContext
 */
export function resolveListInvoicesRequestQuery(
  rawQuery = {},
  { role, activeBranchId },
) {
  const rawBranchId = normalizeBranchIdQuery(rawQuery.branch_id);

  if (!canSwitchActiveBranchRole(role)) {
    return { ...rawQuery, branch_id: activeBranchId };
  }

  if (rawBranchId === ALL_BRANCHES_QUERY) {
    const { branch_id, ...rest } = rawQuery;
    void branch_id;
    return rest;
  }

  if (rawBranchId) {
    return rawQuery;
  }

  if (activeBranchId) {
    return { ...rawQuery, branch_id: activeBranchId };
  }

  return rawQuery;
}

/**
 * @param {ReturnType<typeof parseListInvoicesQuery>} parsed
 */
export function validateListInvoicesQuery(parsed) {
  const { page, limit, branchId, billingMonth, status } = parsed;

  if (
    !Number.isFinite(page) ||
    page < 1 ||
    !Number.isFinite(limit) ||
    limit < 1
  ) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  if (limit > MAX_LIMIT) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  if (branchId && !isValidObjectId(branchId)) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  if (status && !isInvoiceStatus(status)) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  if (billingMonth && !BILLING_MONTH_PATTERN.test(billingMonth)) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  return { ok: true };
}
