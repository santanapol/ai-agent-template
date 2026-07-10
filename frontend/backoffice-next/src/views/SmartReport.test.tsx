import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "@/types/smartReport";

import { mockPaginatedResponse } from "../test/mockFactories";
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

import { getReport, listHistory, listReports, createReport, validateReport, testRunReport } from "../lib/smartReportApiClient";

function renderSmartReport() {
  return renderWithRouter(<SmartReport />);
}

describe("SmartReport (list mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(listReports).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("renders list view with title and create button", async () => {
    renderSmartReport();

    expect(screen.getByText("Smart Report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create report/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(listReports).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  it("renders reports list without global history tab or search placeholder", async () => {
    renderSmartReport();

    expect(screen.queryByRole("tab", { name: /download history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /report scripts/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/search will be available in a future update/i)).not.toBeInTheDocument();
  });

  it("shows empty table state", async () => {
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText("No data found")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton while fetching", () => {
    vi.mocked(listReports).mockImplementation(() => new Promise(() => undefined));

    renderSmartReport();
    expect(document.querySelector('[aria-busy="true"], .animate-pulse')).toBeTruthy();
  });

  it("opens confirm dialog before delete", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    const user = userEvent.setup();

    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByText("Daily Sales")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/delete report/i));
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Confirm Delete Report", danger: true }));
  });

  it("switches to edit view when row edit is clicked", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    vi.mocked(getReport).mockResolvedValue({
      ...sampleReport,
      script: "return [];",
      compiledScript: "compiled",
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

  it("returns to list view when Back is clicked in edit mode", async () => {
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([sampleReport]));
    vi.mocked(getReport).mockResolvedValue({
      ...sampleReport,
      script: "return [];",
      compiledScript: "compiled",
    });

    const user = userEvent.setup();
    renderSmartReport();

    await waitFor(() => {
      expect(screen.getByLabelText(/edit report/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/edit report/i));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/edit report/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
    });
  });

  it(
    "refetches reports on page 2 without re-fetching enrichment history",
    async () => {
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
      expect(listReports).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(listHistory).toHaveBeenCalledWith({ page: 1, limit: 100 });
    });

    const enrichmentCalls = vi.mocked(listHistory).mock.calls.length;
    vi.mocked(listReports).mockClear();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(listReports).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });
    expect(vi.mocked(listHistory).mock.calls.length).toBe(enrichmentCalls);
  },
  10000,
  );

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

describe("SmartReport (create flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReports).mockResolvedValue(mockPaginatedResponse([]));
    vi.mocked(listHistory).mockResolvedValue(mockPaginatedResponse([]));
    vi.mocked(validateReport).mockResolvedValue({
      valid: true,
      compiledScript: "compiled-script",
      errors: [],
    });
    vi.mocked(testRunReport).mockResolvedValue({
      success: true,
      recordCount: 1,
      durationMs: 12,
      sample: [{ id: "1" }],
      testRunToken: "test-token",
      errors: [],
    });
    vi.mocked(createReport).mockResolvedValue({
      ...sampleReport,
      id: "report-new",
      name: "AUDIT-report-001",
    });
  });

  it("completes validate → test-run → save for a new report", async () => {
    const user = userEvent.setup();
    renderSmartReport();

    await user.click(screen.getByRole("button", { name: /create report/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/report name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/report name/i), "AUDIT-report-001");
    await user.click(screen.getByRole("button", { name: /^validate$/i }));

    await waitFor(() => {
      expect(validateReport).toHaveBeenCalled();
      expect(mockFeedback.message.success).toHaveBeenCalledWith("Script validated successfully");
    });

    await user.click(screen.getByRole("button", { name: /test run/i }));

    await waitFor(() => {
      expect(testRunReport).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole("button", { name: /save report script/i });
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    await user.click(saveButton);

    await waitFor(() => {
      expect(createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "AUDIT-report-001",
          compiledScript: "compiled-script",
          testRunToken: "test-token",
        }),
      );
      expect(mockFeedback.message.success).toHaveBeenCalledWith("Report created successfully");
    });
  });
});
