import JSZip from 'jszip';
import * as api from '../../../lib/invoicesApiClient';
import { apiErrorMessage } from '../../../lib/apiError';
import type { Invoice, InvoiceTransaction } from '../../../types/invoice';
import { buildInvoicePdf } from './buildInvoicePdf';
import { buildInvoiceXlsx } from './buildInvoiceXlsx';
import type {
  BulkExportFormat,
  BulkExportOptions,
  BulkExportProgress,
  BulkExportResultItem,
} from './types';

const DEFAULT_CONCURRENCY = 5;

function extensionForFormat(format: BulkExportFormat): string {
  return format === 'pdf' ? 'pdf' : 'xlsx';
}

function buildFileForFormat(
  format: BulkExportFormat,
  invoice: Invoice,
  transactions: InvoiceTransaction[],
): Blob {
  return format === 'pdf'
    ? buildInvoicePdf(invoice, transactions)
    : buildInvoiceXlsx(invoice, transactions);
}

export function formatBulkExportZipFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `invoices_export_${y}${m}${d}_${h}${min}.zip`;
}

async function exportOneInvoice(
  id: string,
  format: BulkExportFormat,
  signal?: AbortSignal,
): Promise<{ blob: Blob; ivNo: string }> {
  const [detailRes, txnRes] = await Promise.all([
    api.getInvoiceById(id, signal),
    api.listInvoiceTransactions(id, signal),
  ]);

  if (!detailRes.data) {
    throw new Error('Invoice not found');
  }

  const invoice = detailRes.data;
  const transactions = Array.isArray(txnRes.data) ? txnRes.data : [];
  const blob = buildFileForFormat(format, invoice, transactions);

  return { blob, ivNo: invoice.iv_no };
}

function emitProgress(
  onProgress: BulkExportOptions['onProgress'],
  progress: BulkExportProgress,
): void {
  onProgress?.(progress);
}

export async function runBulkExport(options: BulkExportOptions): Promise<Blob | null> {
  const {
    invoiceIds,
    format,
    concurrency = DEFAULT_CONCURRENCY,
    signal,
    onProgress,
  } = options;

  if (invoiceIds.length === 0) {
    return null;
  }

  const results: BulkExportResultItem[] = [];
  const successfulFiles: Array<{ filename: string; blob: Blob }> = [];
  let done = 0;
  const total = invoiceIds.length;
  let nextIndex = 0;

  const report = (currentIvNo?: string) => {
    emitProgress(onProgress, { done, total, currentIvNo, results: [...results] });
  };

  const workerCount = Math.min(concurrency, invoiceIds.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      if (signal?.aborted) {
        return;
      }

      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= invoiceIds.length) {
        return;
      }

      const id = invoiceIds[currentIndex];

      if (signal?.aborted) {
        results.push({ id, ivNo: id, status: 'cancelled' });
        done += 1;
        report();
        continue;
      }

      report(id);

      try {
        const { blob, ivNo } = await exportOneInvoice(id, format, signal);

        if (signal?.aborted) {
          results.push({ id, ivNo, status: 'cancelled' });
        } else {
          const ext = extensionForFormat(format);
          successfulFiles.push({ filename: `invoice_${ivNo}.${ext}`, blob });
          results.push({ id, ivNo, status: 'success' });
        }
      } catch (err) {
        if (signal?.aborted) {
          results.push({ id, ivNo: id, status: 'cancelled' });
        } else {
          results.push({
            id,
            ivNo: id,
            status: 'failed',
            error: apiErrorMessage(err, 'Export failed'),
          });
        }
      }

      done += 1;
      report();
    }
  });

  await Promise.all(workers);

  for (let i = results.length; i < total; i += 1) {
    const id = invoiceIds[i];
    results.push({ id, ivNo: id, status: 'cancelled' });
    done += 1;
  }
  report();

  if (successfulFiles.length === 0) {
    return null;
  }

  const zip = new JSZip();
  for (const file of successfulFiles) {
    zip.file(file.filename, file.blob);
  }

  return zip.generateAsync({ type: 'blob' });
}
