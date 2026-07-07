export type BulkItemStatus = 'success' | 'failed' | 'cancelled';

export interface BulkResultItem {
  id: string;
  ivNo: string;
  status: BulkItemStatus;
  error?: string;
}

export interface BulkProgress {
  done: number;
  total: number;
  currentIvNo?: string;
  results: BulkResultItem[];
}
