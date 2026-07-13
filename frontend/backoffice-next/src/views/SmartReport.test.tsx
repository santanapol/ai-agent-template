import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "@/types/smartReport";

import { mockPaginatedResponse } from "../test/mockFactories";
import { testNavigation } from "../test/mockNavigation";
import { renderWithRouter } from "../test/renderWithRouter";
import SmartReport from "./SmartReport";

const mockConfirm = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  notification: { info: vi.fn() },
}));

const sampleReport: Report = {
  id: "report-1",
  name: "Daily Sales",
  description: "Sales summary",
  params: {},
  outputFormat: "csv",
  schedule: null,
  enabled: true,
  validationStatus: "valid",
  validatedAt: "2026-07-01",
  lastTestRunAt: null,
  lastTestRunMeta: null,
  cr_by: "admin",
  cr_date: "2026-07-01",
  cr_prog: "smart-report",
  upd_by: "admin",
  upd_date: "2026-07-01",
  upd_prog: "smart-report",
};

vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

vi.mock("../hooks/useConfirmDialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useConfirmDialog")>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: mockConfirm }),
  };
});

vi.mock("../hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("../lib/smartReportApiClient", () => ({
  listReports: vi.fn().mockResolvedValue({
    success: true,
    code: "OK",
    message: null,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    requestId: "test-request-id",
  }),
  listHistory: vi.fn().mockResolvedValue({
    success: true,
    code: "OK",
    message: null,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    requestId: "test-request-id",
  }),
  getReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  runReport: vi.fn(),
  downloadReportFile: vi.fn(),
  buildEtagFromUpdDate: vi.fn(() => "etag"),
  validateReport: vi.fn(),
  testRunReport: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { deleteReport, listHistory, listReports } from "../lib/smartReportApiClient";

function renderSmartReport() {
  return renderWithRouter(<SmartReport />);
}

describe("SmartReport (list mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([]));
    vi.mocked(listHistory).mockResolvedValue(mockPaginatedResponse([]));
  });

  it("fetches enrichment history and reports once on mount", async () => {
    renderSmartReport();

    await waitFor(() => {
      expect(listReports).toHaveBeenCalledTimes(1);
      expect(listHistory).toHaveBeenCalledTimes(1);
    });
    expect(listHistory).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(listReports).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it("renders list view with title and create button", async () => {
    renderSmartReport();

    expect(screen.getByText("Smart Reports")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create report/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(listReports).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    });
  });

  it("renders search and filter controls", async () => {
    renderSmartReport();

    expect(screen.getByLabelText(/search report name or description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enabled:\s*all/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/schedule:\s*all/i)).toBeInTheDocument();

    // Let mount fetches settle so their state updates stay inside act().
    await waitFor(() => expect(listReports).toHaveBeenCalled());
  });

  it("shows empty table state with create action", async () => {
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText("No reports yet")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^create report$/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows loading skeleton while fetching", async () => {
    vi.mocked(listReports).mockImplementation(() => new Promise(() => undefined));

    renderSmartReport();
    expect(document.querySelector('[aria-busy="true"], .animate-pulse')).toBeTruthy();

    // Enrichment history still resolves; await it so its state update stays inside act().
    await waitFor(() => expect(listHistory).toHaveBeenCalled());
  });

  it("opens delete dialog and deletes report", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    vi.mocked(deleteReport).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText("Daily Sales")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/delete report/i));
    expect(screen.getByText("Confirm Delete Report")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete report$/i }));

    await waitFor(() => {
      expect(deleteReport).toHaveBeenCalledWith(sampleReport.id, "etag");
    });
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("navigates to create route when Create report is clicked", async () => {
    const user = userEvent.setup();
    renderSmartReport();

    await user.click(screen.getByRole("button", { name: /create report/i }));

    expect(testNavigation.push).toHaveBeenCalledWith("/smart-reports/new", undefined);
  });

  it("navigates to edit route when row edit is clicked", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/edit report/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/edit report/i));

    expect(testNavigation.push).toHaveBeenCalledWith(`/smart-reports/${sampleReport.id}/edit`, undefined);
  });

  it("refetches reports on page 2 without re-fetching enrichment history", async () => {
    const pageOneReports = Array.from({ length: 20 }, (_, index) => ({
      ...sampleReport,
      id: `report-${index + 1}`,
      name: `Report ${index + 1}`,
    }));
    vi.mocked(listReports).mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      if (page === 1) {
        return {
          data: pageOneReports,
          pagination: { page: 1, limit, total: 45, totalPages: 3 },
        };
      }
      return {
        data: [{ ...sampleReport, id: `report-page-${page}`, name: `Page ${page} Report` }],
        pagination: { page, limit, total: 45, totalPages: 3 },
      };
    });

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(listReports).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
      expect(listHistory).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });

    const enrichmentCalls = vi.mocked(listHistory).mock.calls.length;
    vi.mocked(listReports).mockClear();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(listReports).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 20 }));
    });
    expect(vi.mocked(listHistory).mock.calls.length).toBe(enrichmentCalls);
  }, 10000);

  it("loads drawer history filtered by report id", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/view download history/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/view download history/i));

    await waitFor(() => {
      expect(listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, reportId: sampleReport.id }),
      );
    });
  });

  it("fetches drawer page 2 when pagination changes", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    const pageOneHistory = Array.from({ length: 20 }, (_, index) => ({
      id: `hist-${index + 1}`,
      reportId: sampleReport.id,
      reportName: sampleReport.name,
      status: "success" as const,
      error: null,
      fileName: `file-${index + 1}.csv`,
      format: "csv" as const,
      recordCount: 10,
      triggeredBy: "manual" as const,
      startedAt: "2026-07-01T00:00:00.000Z",
      finishedAt: "2026-07-01T00:01:00.000Z",
    }));

    vi.mocked(listHistory).mockImplementation(async (params) => {
      if (params?.reportId && params.page === 2) {
        return {
          data: [{ ...pageOneHistory[0], id: "hist-page-2", fileName: "page-2.csv" }],
          pagination: { page: 2, limit: 20, total: 45, totalPages: 3 },
        };
      }
      if (params?.reportId) {
        return {
          data: pageOneHistory,
          pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
        };
      }
      return mockPaginatedResponse([]);
    });

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/view download history/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/view download history/i));

    await waitFor(() => {
      expect(listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, reportId: sampleReport.id }),
      );
    });

    const drawerHistoryCallsBeforePage2 = vi.mocked(listHistory).mock.calls.filter((call) => call[0]?.reportId).length;

    await waitFor(() => {
      expect(screen.getByText("Download History: Daily Sales")).toBeInTheDocument();
    });

    const drawer = screen.getByRole("dialog");
    await waitFor(() => {
      expect(within(drawer).getByRole("button", { name: "2" })).toBeInTheDocument();
    });
    await user.click(within(drawer).getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20, reportId: sampleReport.id }),
      );
    });
    expect(vi.mocked(listHistory).mock.calls.filter((call) => call[0]?.reportId).length).toBeGreaterThan(
      drawerHistoryCallsBeforePage2,
    );
  }, 10000);

  it("resets drawer to page 1 when opening history for a different report", async () => {
    const secondReport = { ...sampleReport, id: "report-2", name: "Weekly Sales" };
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport, secondReport]));

    vi.mocked(listHistory).mockImplementation(async (params) => {
      if (params?.reportId) {
        return {
          data: [],
          pagination: {
            page: params.page ?? 1,
            limit: params.limit ?? 20,
            total: 0,
            totalPages: 1,
          },
        };
      }
      return mockPaginatedResponse([]);
    });

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/view download history/i)).toHaveLength(2);
    });

    await user.click(screen.getAllByLabelText(/view download history/i)[0]);

    await waitFor(() => {
      expect(listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, reportId: sampleReport.id }),
      );
    });

    vi.mocked(listHistory).mockClear();

    await user.click(screen.getAllByLabelText(/view download history/i)[1]);

    await waitFor(() => {
      expect(listHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, reportId: secondReport.id }),
      );
    });
  });

  it("shows fixed toast when report run returns a failed status", async () => {
    const { runReport } = await import("../lib/smartReportApiClient");
    const { toast } = await import("sonner");

    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    vi.mocked(runReport).mockResolvedValue({
      id: "hist-1",
      reportId: sampleReport.id,
      status: "failed",
      error: "raw database error should not appear",
      fileName: null,
      fileId: null,
      recordCount: 0,
      durationMs: 10,
      cr_date: "2026-07-01",
    } as never);

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/run report/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/run report/i));
    await user.click(screen.getByRole("button", { name: /^run$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/failed to run report/i),
        expect.objectContaining({ id: expect.any(String) }),
      );
    });
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining("raw database error"), expect.anything());
  });

  it("shows user-friendly toast when report list load fails", async () => {
    vi.mocked(listReports).mockRejectedValueOnce(new Error("network down"));

    renderSmartReport();

    await waitFor(() => {
      expect(mockFeedback.message.error).toHaveBeenCalledWith("Failed to load reports");
    });
  });
});
