export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListPageParams {
  page?: number;
  limit?: number;
  q?: string;
  enabled?: boolean;
  schedule?: "manual" | "daily" | "weekly" | "monthly";
  reportId?: string;
}

export type ReportOutputFormat = "csv" | "excel";

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export type ValidationStatus = "pending" | "valid" | "invalid";

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number | "last";
  timezone?: string;
}

export interface LastTestRunMeta {
  recordCount: number | null;
  durationMs?: number | null;
}

/** List item — script and compiledScript are omitted from the list API. */
export interface Report {
  id: string;
  name: string;
  description: string | null;
  params: Record<string, unknown>;
  outputFormat: ReportOutputFormat;
  schedule: ReportSchedule | null;
  enabled: boolean;
  validationStatus: ValidationStatus;
  validatedAt: string | null;
  lastTestRunAt: string | null;
  lastTestRunMeta: LastTestRunMeta | null;
  cr_by: string;
  cr_date: string;
  cr_prog: string;
  upd_by: string;
  upd_date: string;
  upd_prog: string;
  /** Present on GET /:id detail only. */
  script?: string;
  compiledScript?: string | null;
  validationErrors?: string[];
}

export type DownloadHistoryStatus = "running" | "success" | "failed";

export type DownloadHistoryTrigger = "manual" | "scheduler";

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

export interface ScriptValidationError {
  line: number | null;
  message: string;
  code: string | null;
}

export interface ValidateReportResult {
  valid: boolean;
  compiledScript: string | null;
  errors: ScriptValidationError[];
}

export interface TestRunReportResult {
  success: boolean;
  recordCount: number;
  durationMs: number;
  sample: Record<string, unknown>[];
  testRunToken: string;
  runParams?: {
    startDate: string;
    endDate: string;
  };
  errors: string[];
}

export interface ReportPayload {
  name?: string;
  description?: string;
  script?: string;
  compiledScript?: string;
  testRunToken?: string;
  params?: Record<string, unknown>;
  outputFormat?: ReportOutputFormat;
  schedule?: ReportSchedule | null;
  enabled?: boolean;
}

export interface CreateReportPayload extends ReportPayload {
  name: string;
  script: string;
  compiledScript: string;
  testRunToken: string;
  outputFormat: ReportOutputFormat;
}

export type UpdateReportPayload = ReportPayload;
