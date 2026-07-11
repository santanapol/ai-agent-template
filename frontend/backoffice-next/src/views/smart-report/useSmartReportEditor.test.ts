import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "@/types/smartReport";

import * as smartReportApi from "../../lib/smartReportApiClient";
import { DEFAULT_QUERY_EXAMPLE } from "./formatters";
import { INITIAL_FORM, useSmartReportEditor } from "./useSmartReportEditor";

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  notification: { info: vi.fn() },
}));

const mockNavigate = vi.fn();
const mockConfirm = vi.fn();

vi.mock("../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

vi.mock("../../hooks/useConfirmDialog", () => ({
  useConfirmDialog: () => ({ confirm: mockConfirm }),
}));

vi.mock("@/navigation/compat", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "report-1" }),
}));

vi.mock("../../lib/smartReportApiClient", () => ({
  getReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  validateReport: vi.fn(),
  testRunReport: vi.fn(),
  buildEtagFromUpdDate: vi.fn(() => "etag"),
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

describe("useSmartReportEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartReportApi.getReport).mockResolvedValue(sampleReport);
  });

  it("initializes create mode with empty script and placeholder baseline", async () => {
    const { result } = renderHook(() => useSmartReportEditor("create"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    expect(result.current.form.query).toBe("");
    expect(result.current.pageTitle).toBe("New report");
    expect(result.current.saveButtonLabel).toBe("Create report");
    expect(result.current.pageDescription).toBe("Name your report, edit the query, then validate.");
    expect(result.current.scriptGateStatus).toBe("pending");
  });

  it("loads example template when Reset is clicked", async () => {
    const { result } = renderHook(() => useSmartReportEditor("create"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    act(() => {
      result.current.handleResetToExample();
    });

    expect(result.current.form.query).toBe(DEFAULT_QUERY_EXAMPLE);
    expect(mockFeedback.notification.info).toHaveBeenCalledWith({ message: "Template loaded" });
  });

  it("loads edit mode and restores validated gate from report", async () => {
    const { result } = renderHook(() => useSmartReportEditor("edit"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    expect(smartReportApi.getReport).toHaveBeenCalledWith("report-1");
    expect(result.current.editingReport?.id).toBe("report-1");
    expect(result.current.compiledScript).toBe("compiled");
    expect(result.current.scriptGateStatus).toBe("validated");
    expect(result.current.pageTitle).toBe("Daily Sales");
  });

  it("resets gate when query changes from baseline", async () => {
    const { result } = renderHook(() => useSmartReportEditor("edit"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    act(() => {
      result.current.handleQueryScriptChange("return [{ id: 2 }];");
    });

    expect(result.current.scriptGateStatus).toBe("pending");
    expect(result.current.compiledScript).toBeNull();
  });

  it("derives saveButtonTooltip when gate blocks save", async () => {
    const { result } = renderHook(() => useSmartReportEditor("create"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    expect(result.current.canSaveScript).toBe(false);
    expect(result.current.canSaveReport).toBe(false);
    expect(result.current.saveButtonTooltip).toBe("Validate script first");
  });

  it("allows metadata save on edit when script is unchanged and form is dirty", async () => {
    vi.mocked(smartReportApi.getReport).mockResolvedValue({ ...sampleReport, description: "" });
    const { result } = renderHook(() => useSmartReportEditor("edit"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    expect(result.current.scriptRequiresGate).toBe(false);
    expect(result.current.pageDescription).toBe("Script unchanged — save metadata anytime.");
    expect(result.current.canSaveReport).toBe(false);

    act(() => {
      result.current.setField("description", "Updated summary");
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSaveReport).toBe(true);
  });

  it("navigates away on handleLeave when not dirty", async () => {
    const { result } = renderHook(() => useSmartReportEditor("create"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    act(() => {
      result.current.handleLeave();
    });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/smart-reports");
  });

  it("syncs page title when report name changes", async () => {
    const { result } = renderHook(() => useSmartReportEditor("create"));

    await waitFor(() => {
      expect(result.current.pageLoading).toBe(false);
    });

    act(() => {
      result.current.setField("name", "Renamed Report");
    });

    expect(result.current.pageTitle).toBe("Renamed Report");
  });

  it("exports INITIAL_FORM with manual schedule defaults", () => {
    expect(INITIAL_FORM.schedule).toBe("manual");
    expect(INITIAL_FORM.outputFormat).toBe("csv");
  });
});
