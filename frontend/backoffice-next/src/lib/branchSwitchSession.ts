const INVOICES_HANDLED_KEY = "zero:invoices:handled-branch-switch-at";

/** Once per sidebar branch switch — sync invoice list branch filter to the new active branch. */
export function shouldApplyInvoiceBranchSwitchFilter(lastBranchSwitchAt: number | null): boolean {
  if (lastBranchSwitchAt == null || typeof sessionStorage === "undefined") return false;
  const token = String(lastBranchSwitchAt);
  if (sessionStorage.getItem(INVOICES_HANDLED_KEY) === token) return false;
  sessionStorage.setItem(INVOICES_HANDLED_KEY, token);
  return true;
}

export function clearInvoiceBranchSwitchFilterState(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(INVOICES_HANDLED_KEY);
}
