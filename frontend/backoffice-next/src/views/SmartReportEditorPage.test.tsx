import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "@/navigation/compat";
import type { Report } from "@/types/smartReport";

import * as smartReportApi from "../lib/smartReportApiClient";
import { testNavigation } from "../test/mockNavigation";
import { renderWithRouter } from "../test/renderWithRouter";
import SmartReport from "./SmartReport";
import SmartReportEditorPage from "./SmartReportEditorPage";

const mockConfirm = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
  script: "return [];",
  compiledScript: "compiled",
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
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  }),
  listHistory: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
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

function renderEditorRoutes(initialPath: string) {
  return renderWithRouter(
    <Routes>
      <Route path="/smart-reports" element={<SmartReport />} />
      <Route path="/smart-reports/new" element={<SmartReportEditorPage mode="create" />} />
      <Route path="/smart-reports/:id/edit" element={<SmartReportEditorPage mode="edit" />} />
    </Routes>,
    { initialEntries: [initialPath] },
  );
}

describe("SmartReportEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    vi.mocked(smartReportApi.getReport).mockResolvedValue(sampleReport);
    vi.mocked(smartReportApi.validateReport).mockResolvedValue({
      valid: true,
      compiledScript: "compiled-script",
      errors: [],
    });
    vi.mocked(smartReportApi.testRunReport).mockResolvedValue({
      success: true,
      recordCount: 1,
      durationMs: 12,
      sample: [{ id: "1" }],
      testRunToken: "test-token",
      errors: [],
    });
    vi.mocked(smartReportApi.createReport).mockResolvedValue({
      ...sampleReport,
      id: "report-new",
      name: "AUDIT-report-001",
    });
  });

  it("renders create editor with back navigation and create report button", async () => {
    renderEditorRoutes("/smart-reports/new");

    expect(await screen.findByRole("heading", { name: /new report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /breadcrumb/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create report/i })).toBeDisabled();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Name your report, edit the query, then validate.")).toBeInTheDocument();
  });

  it("loads edit route and shows report title", async () => {
    renderEditorRoutes("/smart-reports/report-1/edit");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /daily sales/i })).toBeInTheDocument();
    });
    expect(smartReportApi.getReport).toHaveBeenCalledWith("report-1");
  });

  it("completes validate → test-run → save for a new report", async () => {
    const user = userEvent.setup();
    renderEditorRoutes("/smart-reports/new");

    await screen.findByLabelText(/report name/i);
    await user.type(screen.getByLabelText(/report name/i), "AUDIT-report-001");
    await user.click(screen.getByLabelText(/query script/i));
    await user.paste("return [];");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => {
      expect(smartReportApi.validateReport).toHaveBeenCalled();
      expect(mockFeedback.message.success).toHaveBeenCalledWith("Script validated successfully");
    });

    await user.click(screen.getByRole("button", { name: /test/i }));

    await waitFor(() => {
      expect(smartReportApi.testRunReport).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create report/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /create report/i }));

    await waitFor(() => {
      expect(smartReportApi.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "AUDIT-report-001",
          compiledScript: "compiled-script",
          testRunToken: "test-token",
        }),
      );
      expect(testNavigation.push).toHaveBeenCalledWith("/smart-reports", undefined);
    });
  });

  it("navigates to list when Back is clicked without dirty changes", async () => {
    const user = userEvent.setup();
    renderEditorRoutes("/smart-reports/new");

    await screen.findByRole("button", { name: /^back$/i });
    await user.click(screen.getByRole("button", { name: /^back$/i }));

    await waitFor(() => {
      expect(testNavigation.push).toHaveBeenCalledWith("/smart-reports", undefined);
    });
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("shows report description as page subtitle when set", async () => {
    renderEditorRoutes("/smart-reports/report-1/edit");

    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Sales summary"),
      ).toBeInTheDocument();
    });
  });
});
