import type { ApiEnvelope } from '../types/agents';
import type {
  Report,
  CreateReportPayload,
  UpdateReportPayload,
  DownloadHistoryRecord,
} from '../types/smartReport';
import { baseClient as client } from './baseApiClient';

const BASE_PATH = '/api/v1/smart-reports';

export async function listReports(): Promise<Report[]> {
  const res = await client.get<ApiEnvelope<Report[]>>(BASE_PATH);
  return res.data.data;
}

export async function createReport(payload: CreateReportPayload): Promise<{ id: string }> {
  const res = await client.post<ApiEnvelope<{ id: string }>>(BASE_PATH, payload);
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

export async function runReport(id: string): Promise<DownloadHistoryRecord> {
  const res = await client.post<ApiEnvelope<DownloadHistoryRecord>>(`${BASE_PATH}/${id}/run`);
  return res.data.data;
}

export async function listHistory(): Promise<DownloadHistoryRecord[]> {
  const res = await client.get<ApiEnvelope<DownloadHistoryRecord[]>>(`${BASE_PATH}/history`);
  return res.data.data;
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
