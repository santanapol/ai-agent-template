export type BulkExportFormat = 'pdf' | 'xlsx';

export type BulkExportItemStatus = 'success' | 'failed' | 'cancelled';

export interface BulkExportResultItem {
  id: string;
  ivNo: string;
  status: BulkExportItemStatus;
  error?: string;
}

export interface BulkExportProgress {
  done: number;
  total: number;
  currentIvNo?: string;
  results: BulkExportResultItem[];
}

export interface BulkExportOptions {
  invoiceIds: string[];
  format: BulkExportFormat;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: BulkExportProgress) => void;
}
