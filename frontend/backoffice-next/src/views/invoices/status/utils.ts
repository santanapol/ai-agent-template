import type { InvoiceStatus } from "../../../types/invoice";

export function canMarkInvoicePaid(status: string): boolean {
  return status === "READY";
}

export function canCancelInvoice(status: string): boolean {
  return (["READY", "PENDING", "MISSING_FEE", "ERROR"] as InvoiceStatus[]).includes(status as InvoiceStatus);
}

export function ineligibleStatusMessage(action: "PAID" | "VOID", status: string): string {
  if (action === "PAID") {
    return `Cannot mark as PAID — status is ${status} (must be READY)`;
  }
  return `Cannot cancel — status is ${status}`;
}
