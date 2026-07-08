import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartReport from './SmartReport';
import { renderWithRouter } from '../test/renderWithRouter';
import { PageBreadcrumbProvider } from '@/contexts/PageBreadcrumbContext';
import { mockPaginatedResponse } from '../test/mockFactories';
import type { Report } from '@/types/smartReport';

const mockConfirm = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  notification: { info: vi.fn() },
}));

const sampleReport: Report = {
  id: 'report-1',
  name: 'Daily Sales',
  description: 'Sales summary',
  params: {},
  outputFormat: 'csv',
  schedule: null,
  enabled: true,
  validationStatus: 'valid',
  validatedAt: '2026-07-01',
  lastTestRunAt: null,
  lastTestRunMeta: null,
  cr_by: 'admin',
  cr_date: '2026-07-01',
  cr_prog: 'smart-report',
  upd_by: 'admin',
  upd_date: '2026-07-01',
  upd_prog: 'smart-report',
};

vi.mock('../hooks/useAppFeedback', () => ({
  useAppFeedback: () => mockFeedback,
}));

vi.mock('../hooks/useConfirmDialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useConfirmDialog')>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: mockConfirm }),
  };
});

vi.mock('../hooks/useMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../lib/smartReportApiClient', () => ({
  listReports: vi.fn().mockResolvedValue({
    success: true,
    code: 'OK',
    message: null,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    requestId: 'test-request-id',
  }),
  listHistory: vi.fn().mockResolvedValue({
    success: true,
    code: 'OK',
    message: null,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    requestId: 'test-request-id',
  }),
  getReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  runReport: vi.fn(),
  downloadReportFile: vi.fn(),
  buildEtagFromUpdDate: vi.fn(() => 'etag'),
  validateReport: vi.fn(),
  testRunReport: vi.fn(),
}));

import { listReports, listHistory, getReport } from '../lib/smartReportApiClient';

function renderSmartReport() {
  return renderWithRouter(
    <PageBreadcrumbProvider baseBreadcrumb={{ parent: null, page: 'Smart Report' }}>
      {() => <SmartReport />}
    </PageBreadcrumbProvider>,
  );
}

describe('SmartReport (list mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([]));
    vi.mocked(listHistory).mockResolvedValue(mockPaginatedResponse([]));
  });

  it('renders list view with title and create button', async () => {
    renderSmartReport();

    expect(screen.getByText('Smart Report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create report/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(listReports).toHaveBeenCalled();
    });
  });

  it('shows empty table state', async () => {
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(listReports).mockImplementation(() => new Promise(() => {}));

    renderSmartReport();
    expect(document.querySelector('[aria-busy="true"], .animate-pulse')).toBeTruthy();
  });

  it('opens confirm dialog before delete', async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    const user = userEvent.setup();

    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText('Daily Sales')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/delete report/i));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Confirm Delete Report', danger: true }),
    );
  });

  it('switches to edit view when row edit is clicked', async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    vi.mocked(getReport).mockResolvedValue({
      ...sampleReport,
      script: 'return [];',
      compiledScript: 'compiled',
    });

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/edit report/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/edit report/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/report name/i)).toBeInTheDocument();
    });
  });
});
