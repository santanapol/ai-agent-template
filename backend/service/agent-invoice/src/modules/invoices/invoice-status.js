export const INVOICE_STATUSES = [
  "PENDING",
  "VOID",
  "CAL",
  "MISSING_FEE",
  "READY",
  "ERROR",
  "PAID",
];

/**
 * @param {string} status
 */
export function isInvoiceStatus(status) {
  return INVOICE_STATUSES.includes(status);
}
