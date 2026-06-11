import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listReports,
  createReport,
  updateReport,
  deleteReport,
  runReport,
  listHistory,
  downloadReportFile,
  buildEtagFromUpdDate,
} from './smartReportApiClient';

const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('./baseApiClient', () => ({
  baseClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

describe('smartReportApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listReports calls GET /api/v1/smart-reports and returns data + pagination', async () => {
    const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], pagination } });
    const result = await listReports();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports', { params: {} });
    expect(result).toEqual({ data: [], pagination });
  });

  it('listReports forwards page/limit query params', async () => {
    const pagination = { page: 2, limit: 100, total: 150, totalPages: 2 };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], pagination } });
    const result = await listReports({ page: 2, limit: 100 });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports', {
      params: { page: 2, limit: 100 },
    });
    expect(result).toEqual({ data: [], pagination });
  });

  it('createReport calls POST /api/v1/smart-reports', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: { id: 'rep-1' } } });
    const payload = { name: 'Test', script: 'db.x.find()', outputFormat: 'csv' as const };
    const result = await createReport(payload);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/smart-reports', payload);
    expect(result).toEqual({ id: 'rep-1' });
  });

  it('updateReport calls PUT with If-Match header', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true, data: null } });
    const payload = { name: 'Updated' };
    await updateReport('rep-1', payload, 'W/"abc"');
    expect(mockPut).toHaveBeenCalledWith('/api/v1/smart-reports/rep-1', payload, {
      headers: { 'If-Match': 'W/"abc"' },
    });
  });

  it('deleteReport calls DELETE with If-Match header', async () => {
    mockDelete.mockResolvedValueOnce({ data: { success: true, data: null } });
    await deleteReport('rep-1', 'W/"abc"');
    expect(mockDelete).toHaveBeenCalledWith('/api/v1/smart-reports/rep-1', {
      headers: { 'If-Match': 'W/"abc"' },
    });
  });

  it('runReport calls POST /:id/run', async () => {
    const record = { id: 'hist-1', reportId: 'rep-1', status: 'success' };
    mockPost.mockResolvedValueOnce({ data: { success: true, data: record } });
    const result = await runReport('rep-1');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/smart-reports/rep-1/run');
    expect(result).toEqual(record);
  });

  it('listHistory calls GET /history and returns data + pagination', async () => {
    const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], pagination } });
    const result = await listHistory();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports/history', { params: {} });
    expect(result).toEqual({ data: [], pagination });
  });

  it('listHistory forwards page/limit query params', async () => {
    const pagination = { page: 1, limit: 100, total: 30, totalPages: 1 };
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], pagination } });
    const result = await listHistory({ page: 1, limit: 100 });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports/history', {
      params: { page: 1, limit: 100 },
    });
    expect(result).toEqual({ data: [], pagination });
  });

  it('buildEtagFromUpdDate matches the backend weak ETag format', () => {
    const updDate = '2026-06-10T00:00:00.000Z';
    expect(buildEtagFromUpdDate(updDate)).toBe(`W/"${btoa(updDate)}"`);
  });

  describe('downloadReportFile', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('fetches the file as a blob and triggers a download', async () => {
      const blob = new Blob(['file-content']);
      mockGet.mockResolvedValueOnce({ data: blob });

      const clickSpy = vi.fn();
      const link = document.createElement('a');
      link.click = clickSpy;
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link);

      await downloadReportFile('file-1', 'report.csv');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports/download/file-1', {
        responseType: 'blob',
      });
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(link.download).toBe('report.csv');
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      createElementSpy.mockRestore();
    });
  });
});
