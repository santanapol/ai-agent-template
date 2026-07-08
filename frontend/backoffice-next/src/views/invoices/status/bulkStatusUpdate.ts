import { apiErrorMessage } from "../../../lib/apiError";
import * as api from "../../../lib/invoicesApiClient";
import { buildInvoiceEtag } from "../bulk/invoiceEtag";
import { runWithConcurrency } from "../bulk/runWithConcurrency";
import type { BulkStatusAction, BulkStatusUpdateOptions, BulkStatusUpdateSummary } from "./types";
import { canCancelInvoice, canMarkInvoicePaid, ineligibleStatusMessage } from "./utils";

function isEligible(action: BulkStatusAction, status: string): boolean {
  return action === "PAID" ? canMarkInvoicePaid(status) : canCancelInvoice(status);
}

function summarizeResults(results: Array<{ status: string }>): BulkStatusUpdateSummary {
  return {
    successCount: results.filter((item) => item.status === "success").length,
    failedCount: results.filter((item) => item.status === "failed").length,
    cancelledCount: results.filter((item) => item.status === "cancelled").length,
  };
}

export async function runBulkStatusUpdate(options: BulkStatusUpdateOptions): Promise<BulkStatusUpdateSummary> {
  const { invoiceIds, action, concurrency, signal, onProgress } = options;

  if (invoiceIds.length === 0) {
    return { successCount: 0, failedCount: 0, cancelledCount: 0 };
  }

  const results = await runWithConcurrency({
    invoiceIds,
    concurrency,
    signal,
    onProgress,
    processInvoice: async (id, processSignal) => {
      let ivNo = id;

      try {
        if (processSignal?.aborted) {
          return { id, ivNo, status: "cancelled" };
        }

        const detailRes = await api.getInvoiceById(id, processSignal);
        if (!detailRes.data) {
          throw new Error("Invoice not found");
        }

        const invoice = detailRes.data;
        ivNo = invoice.iv_no;

        if (!isEligible(action, invoice.status)) {
          return {
            id,
            ivNo,
            status: "failed",
            error: ineligibleStatusMessage(action, invoice.status),
          };
        }

        const etag = buildInvoiceEtag(invoice.upd_date);
        if (!etag) {
          return {
            id,
            ivNo,
            status: "failed",
            error: "Missing invoice version — refresh and try again",
          };
        }

        const targetStatus = action === "PAID" ? "PAID" : "VOID";
        await api.updateInvoiceStatus(id, targetStatus, etag);
        return { id, ivNo, status: "success" };
      } catch (err) {
        if (processSignal?.aborted) {
          return { id, ivNo, status: "cancelled" };
        }
        return {
          id,
          ivNo,
          status: "failed",
          error: apiErrorMessage(err, "Status update failed"),
        };
      }
    },
  });

  return summarizeResults(results);
}

export function bulkStatusActionLabel(action: BulkStatusAction): string {
  return action === "PAID" ? "Mark as PAID" : "Cancel Invoices";
}
