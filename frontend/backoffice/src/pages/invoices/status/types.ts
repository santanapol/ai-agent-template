import type {
  BulkItemStatus,
  BulkProgress,
  BulkResultItem,
} from '../bulk/types';

export type BulkStatusAction = 'PAID' | 'VOID';

export type BulkStatusItemStatus = BulkItemStatus;
export type BulkStatusResultItem = BulkResultItem;
export type BulkStatusProgress = BulkProgress;

export interface BulkStatusUpdateOptions {
  invoiceIds: string[];
  action: BulkStatusAction;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: BulkStatusProgress) => void;
}

export interface BulkStatusUpdateSummary {
  successCount: number;
  failedCount: number;
  cancelledCount: number;
}
