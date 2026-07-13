/**
 * @param {import('mongodb').ObjectId | string | null | undefined} value
 */
export function toApiId(value) {
  // eslint-disable-next-line eqeqeq
  if (value == null) return value;
  return typeof value === "string" ? value : String(value);
}

/**
 * List item shape — no `ou_name` (tenant is implicit from gateway).
 *
 * @param {Record<string, unknown>} doc
 * @param {{ branchName?: string | null }} [names]
 */
export function mapInvoiceListItemForApi(doc, names = {}) {
  return {
    _id: toApiId(doc._id),
    ou_id: toApiId(doc.ou_id),
    branch_id: toApiId(doc.branch_id),
    branch_name: names.branchName ?? null,
    iv_no: doc.iv_no,
    billing_month: doc.billing_month ?? null,
    due_date: doc.due_date ?? null,
    net_win: doc.net_win ?? null,
    bet: doc.bet ?? null,
    amount: doc.amount ?? null,
    status: doc.status,
    cr_by: doc.cr_by,
    cr_prog: doc.cr_prog,
    cr_date: doc.cr_date,
    upd_by: doc.upd_by,
    upd_prog: doc.upd_prog,
    upd_date: doc.upd_date,
  };
}

/**
 * Normalize agent currency for API (ERD stores lowercase; responses use uppercase).
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeInvoiceCurrency(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * @param {Record<string, unknown>} doc
 * @param {{ branchName?: string | null, ouName?: string | null, currency?: string | null }} [names]
 */
export function mapInvoiceForApi(doc, names = {}) {
  return {
    _id: toApiId(doc._id),
    ou_id: toApiId(doc.ou_id),
    ou_name: names.ouName ?? null,
    branch_id: toApiId(doc.branch_id),
    branch_name: names.branchName ?? null,
    iv_no: doc.iv_no,
    billing_month: doc.billing_month ?? null,
    due_date: doc.due_date ?? null,
    net_win: doc.net_win ?? null,
    bet: doc.bet ?? null,
    amount: doc.amount ?? null,
    currency: normalizeInvoiceCurrency(names.currency),
    status: doc.status,
    cr_by: doc.cr_by,
    cr_prog: doc.cr_prog,
    cr_date: doc.cr_date,
    upd_by: doc.upd_by,
    upd_prog: doc.upd_prog,
    upd_date: doc.upd_date,
  };
}

/**
 * @param {Record<string, unknown>} doc
 * @param {{ branchName?: string | null, ouName?: string | null, companyName?: string | null, mainCategoryName?: string | null }} [names]
 */
export function mapTransactionForApi(doc, names = {}) {
  return {
    _id: toApiId(doc._id),
    ref_iv_id: toApiId(doc.ref_iv_id),
    ou_id: toApiId(doc.ou_id),
    ou_name: names.ouName ?? null,
    branch_id: toApiId(doc.branch_id),
    branch_name: names.branchName ?? null,
    company_id: toApiId(doc.company_id),
    company_name: names.companyName ?? null,
    main_category_id: toApiId(doc.main_category_id),
    main_category_name: names.mainCategoryName ?? null,
    net_win: doc.net_win,
    bet: doc.bet,
    fee: doc.fee,
    amount: doc.amount,
    cr_by: doc.cr_by,
    cr_prog: doc.cr_prog,
    cr_date: doc.cr_date,
    upd_by: doc.upd_by,
    upd_prog: doc.upd_prog,
    upd_date: doc.upd_date,
  };
}
