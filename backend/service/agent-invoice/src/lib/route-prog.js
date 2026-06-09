/** Audit `cr_prog` / `upd_prog` values — must match registered route paths. */
export const ROUTE_PROG = {
  INVOICES_GENERATE: "/api/v1/invoices/generate",
  INVOICES_CALCULATE_FEE: "/api/v1/invoices/calculate-fee",
  INVOICES_STATUS: "/api/v1/invoices/:id/status",
};
