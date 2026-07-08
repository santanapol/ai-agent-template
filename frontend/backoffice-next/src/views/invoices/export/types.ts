import type { BulkItemStatus, BulkProgress, BulkResultItem } from "../bulk/types";

export type BulkExportFormat = "pdf" | "xlsx";

export type BulkExportItemStatus = BulkItemStatus;
export type BulkExportResultItem = BulkResultItem;
export type BulkExportProgress = BulkProgress;

export interface BulkExportOptions {
  invoiceIds: string[];
  format: BulkExportFormat;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: BulkExportProgress) => void;
}
