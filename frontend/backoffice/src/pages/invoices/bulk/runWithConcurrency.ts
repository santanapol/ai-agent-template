import { DEFAULT_BULK_CONCURRENCY } from './constants';
import { markUnprocessedAsCancelled } from './markUnprocessed';
import type { BulkProgress, BulkResultItem } from './types';

export interface RunWithConcurrencyOptions {
  invoiceIds: string[];
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: BulkProgress) => void;
  processInvoice: (id: string, signal?: AbortSignal) => Promise<BulkResultItem>;
}

export async function runWithConcurrency(
  options: RunWithConcurrencyOptions,
): Promise<BulkResultItem[]> {
  const {
    invoiceIds,
    concurrency = DEFAULT_BULK_CONCURRENCY,
    signal,
    onProgress,
    processInvoice,
  } = options;

  if (invoiceIds.length === 0) {
    return [];
  }

  const results: BulkResultItem[] = [];
  let done = 0;
  const total = invoiceIds.length;
  let nextIndex = 0;

  const report = (currentIvNo?: string) => {
    onProgress?.({ done, total, currentIvNo, results: [...results] });
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
      report(id);

      const result = await processInvoice(id, signal);
      results.push(result);

      done += 1;
      report();
    }
  });

  await Promise.all(workers);

  const cancelled = markUnprocessedAsCancelled(invoiceIds, results);
  if (cancelled.length > 0) {
    results.push(...cancelled);
    done += cancelled.length;
    report();
  }

  return results;
}
