import type { BulkResultItem } from './types';

export function markUnprocessedAsCancelled(
  invoiceIds: string[],
  results: BulkResultItem[],
): BulkResultItem[] {
  const processed = new Set(results.map((item) => item.id));
  const additions: BulkResultItem[] = [];

  for (const id of invoiceIds) {
    if (processed.has(id)) {
      continue;
    }
    additions.push({ id, ivNo: id, status: 'cancelled' });
  }

  return additions;
}

export function failedResultIds(results: BulkResultItem[]): string[] {
  return results.filter((item) => item.status === 'failed').map((item) => item.id);
}
