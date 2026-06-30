import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateReport, testRunReport, getReport } from './smartReportApiClient';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('./baseApiClient', () => ({
  baseClient: {
    get: mockGet,
    post: mockPost,
  },
}));

describe('smartReportApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validateReport maps validation response', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          valid: true,
          compiledScript: 'withReport(async () => {})',
          errors: [],
        },
      },
    });

    const result = await validateReport('db.collection.find()');
    expect(mockPost).toHaveBeenCalledWith('/api/v1/smart-reports/validate', {
      script: 'db.collection.find()',
    });
    expect(result.valid).toBe(true);
    expect(result.compiledScript).toContain('withReport');
  });

  it('testRunReport maps testRunToken', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          success: true,
          recordCount: 3,
          durationMs: 120,
          sample: [{ a: 1 }],
          testRunToken: 'token-abc',
          runParams: {
            startDate: '2026-06-29T00:00:00.000Z',
            endDate: '2026-06-29T23:59:59.999Z',
          },
          errors: [],
        },
      },
    });

    const result = await testRunReport('src', 'compiled');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/smart-reports/test-run',
      { script: 'src', compiledScript: 'compiled' },
      { signal: undefined },
    );
    expect(result.testRunToken).toBe('token-abc');
    expect(result.recordCount).toBe(3);
  });

  it('testRunReport forwards AbortSignal to axios', async () => {
    const controller = new AbortController();
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          success: true,
          recordCount: 0,
          durationMs: 1,
          sample: [],
          testRunToken: 'token',
          runParams: {
            startDate: '2026-06-29T00:00:00.000Z',
            endDate: '2026-06-29T23:59:59.999Z',
          },
          errors: [],
        },
      },
    });

    await testRunReport('src', 'compiled', undefined, controller.signal);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/smart-reports/test-run',
      { script: 'src', compiledScript: 'compiled' },
      { signal: controller.signal },
    );
  });

  it('getReport fetches detail by id', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: { id: 'abc123', name: 'Report', script: 'find()' },
      },
    });

    const report = await getReport('abc123');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/smart-reports/abc123');
    expect(report.script).toBe('find()');
  });
});
