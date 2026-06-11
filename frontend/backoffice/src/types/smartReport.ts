export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListPageParams {
  page?: number;
  limit?: number;
}

export type ReportOutputFormat = 'csv' | 'excel';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number | 'last';
  timezone?: string;
}

export interface Report {
  id: string;
  name: string;
  description: string | null;
  script: string;
  params: Record<string, unknown>;
  outputFormat: ReportOutputFormat;
  schedule: ReportSchedule | null;
  enabled: boolean;
  cr_by: string;
  cr_date: string;
  cr_prog: string;
  upd_by: string;
  upd_date: string;
  upd_prog: string;
}

export type DownloadHistoryStatus = 'running' | 'success' | 'failed';

export type DownloadHistoryTrigger = 'manual' | 'scheduler';

export interface DownloadHistoryRecord {
  id: string;
  reportId: string;
  reportName: string;
  fileName: string | null;
  format: ReportOutputFormat;
  status: DownloadHistoryStatus;
  recordCount: number | null;
  error: string | null;
  triggeredBy: DownloadHistoryTrigger;
  startedAt: string;
  finishedAt: string | null;
}

export interface ReportPayload {
  name?: string;
  description?: string;
  script?: string;
  params?: Record<string, unknown>;
  outputFormat?: ReportOutputFormat;
  schedule?: ReportSchedule | null;
  enabled?: boolean;
}

export interface CreateReportPayload extends ReportPayload {
  name: string;
  script: string;
  outputFormat: ReportOutputFormat;
}

export type UpdateReportPayload = ReportPayload;
