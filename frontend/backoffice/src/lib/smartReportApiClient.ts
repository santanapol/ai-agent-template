import type { ApiEnvelope } from '../types/agents';
import type {
  Report,
  CreateReportPayload,
  UpdateReportPayload,
  DownloadHistoryRecord,
  ListPageParams,
  PaginationMeta,
  ValidateReportResult,
  TestRunReportResult,
} from '../types/smartReport';
import { baseClient as client } from './baseApiClient';

const BASE_PATH = '/api/v1/smart-reports';

export async function listReports(
  params: ListPageParams = {},
): Promise<{ data: Report[]; pagination: PaginationMeta }> {
  const res = await client.get<ApiEnvelope<Report[]> & { pagination: PaginationMeta }>(BASE_PATH, {
    params,
  });
  return { data: res.data.data, pagination: res.data.pagination };
}

export async function getReport(id: string): Promise<Report> {
  const res = await client.get<ApiEnvelope<Report>>(`${BASE_PATH}/${id}`);
  return res.data.data;
}

export async function createReport(payload: CreateReportPayload): Promise<Report> {
  const res = await client.post<ApiEnvelope<Report>>(BASE_PATH, payload);
  return res.data.data;
}

export async function updateReport(
  id: string,
  payload: UpdateReportPayload,
  etag: string,
): Promise<void> {
  await client.put(`${BASE_PATH}/${id}`, payload, { headers: { 'If-Match': etag } });
}

export async function deleteReport(id: string, etag: string): Promise<void> {
  await client.delete(`${BASE_PATH}/${id}`, { headers: { 'If-Match': etag } });
}

export async function validateReport(script: string): Promise<ValidateReportResult> {
  const res = await client.post<ApiEnvelope<ValidateReportResult>>(`${BASE_PATH}/validate`, {
    script,
  });
  return res.data.data;
}

export async function testRunReport(
  script: string,
  compiledScript: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<TestRunReportResult> {
  const res = await client.post<ApiEnvelope<TestRunReportResult>>(
    `${BASE_PATH}/test-run`,
    {
      script,
      compiledScript,
      ...(params ? { params } : {}),
    },
    { signal },
  );
  return res.data.data;
}

export async function runReport(id: string): Promise<DownloadHistoryRecord> {
  const res = await client.post<ApiEnvelope<DownloadHistoryRecord>>(`${BASE_PATH}/${id}/run`);
  return res.data.data;
}

export async function listHistory(
  params: ListPageParams = {},
): Promise<{ data: DownloadHistoryRecord[]; pagination: PaginationMeta }> {
  const res = await client.get<ApiEnvelope<DownloadHistoryRecord[]> & { pagination: PaginationMeta }>(
    `${BASE_PATH}/history`,
    { params },
  );
  return { data: res.data.data, pagination: res.data.pagination };
}

/** Builds the weak ETag the backend expects in `If-Match`, matching `buildEtag` in `smart-report/src/lib/etag.js`. */
export function buildEtagFromUpdDate(updDate: string): string {
  return `W/"${btoa(updDate)}"`;
}

export async function downloadReportFile(fileId: string, fileName: string): Promise<void> {
  const res = await client.get(`${BASE_PATH}/download/${fileId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
