import JSZip from "jszip";

import { apiErrorMessage } from "../../../lib/apiError";
import * as api from "../../../lib/invoicesApiClient";
import type { Invoice, InvoiceTransaction } from "../../../types/invoice";
import { runWithConcurrency } from "../bulk/runWithConcurrency";
import { buildInvoicePdf } from "./buildInvoicePdf";
import { buildInvoiceXlsx } from "./buildInvoiceXlsx";
import type { BulkExportFormat, BulkExportOptions } from "./types";

function extensionForFormat(format: BulkExportFormat): string {
  return format === "pdf" ? "pdf" : "xlsx";
}

export function sanitizeInvoiceFilename(ivNo: string): string {
  return ivNo.replace(/[/\\]/g, "_");
}

function buildFileForFormat(format: BulkExportFormat, invoice: Invoice, transactions: InvoiceTransaction[]): Blob {
  return format === "pdf" ? buildInvoicePdf(invoice, transactions) : buildInvoiceXlsx(invoice, transactions);
}

export function formatBulkExportZipFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `invoices_export_${y}${m}${d}_${h}${min}.zip`;
}

export async function runBulkExport(options: BulkExportOptions): Promise<Blob | null> {
  const { invoiceIds, format, concurrency, signal, onProgress } = options;

  if (invoiceIds.length === 0) {
    return null;
  }

  const successfulFiles: Array<{ filename: string; blob: Blob }> = [];

  await runWithConcurrency({
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
        ivNo = detailRes.data.iv_no;

        const txnRes = await api.listInvoiceTransactions(id, processSignal);
        const transactions = Array.isArray(txnRes.data) ? txnRes.data : [];
        const blob = buildFileForFormat(format, detailRes.data, transactions);

        if (processSignal?.aborted) {
          return { id, ivNo, status: "cancelled" };
        }

        const ext = extensionForFormat(format);
        const safeIvNo = sanitizeInvoiceFilename(ivNo);
        successfulFiles.push({ filename: `invoice_${safeIvNo}.${ext}`, blob });
        return { id, ivNo, status: "success" };
      } catch (err) {
        if (processSignal?.aborted) {
          return { id, ivNo, status: "cancelled" };
        }
        return {
          id,
          ivNo,
          status: "failed",
          error: apiErrorMessage(err, "Export failed"),
        };
      }
    },
  });

  if (successfulFiles.length === 0) {
    return null;
  }

  const zip = new JSZip();
  for (const file of successfulFiles) {
    zip.file(file.filename, file.blob);
  }

  return zip.generateAsync({ type: "blob" });
}
