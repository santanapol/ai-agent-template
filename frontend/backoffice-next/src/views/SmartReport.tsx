import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer } from "@/components/layout";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useIsMobile } from "@/hooks/useMobile";
import { apiErrorMessage } from "@/lib/apiError";
import {
  buildEtagFromUpdDate,
  createReport,
  deleteReport,
  downloadReportFile,
  getReport,
  listHistory,
  listReports,
  runReport,
  testRunReport,
  updateReport,
  validateReport,
} from "@/lib/smartReportApiClient";
import {
  buildPreviewTable,
  type EditorSnapshot,
  canSaveScript as evaluateCanSaveScript,
  scriptRequiresGate as evaluateScriptRequiresGate,
  getSaveGateHint,
  getScriptGateStep,
  getTestRunDateTagLabel,
  isEditorDirty,
  type ScriptGateStatus,
} from "@/lib/smartReportScriptGate";
import type {
  CreateReportPayload,
  DownloadHistoryRecord,
  Report,
  ReportPayload,
  ScriptValidationError,
} from "@/types/smartReport";

import { type ReportFormValues, SmartReportEditor } from "./SmartReportEditor";
import { SmartReportList, type EnabledFilter, type ScheduleFilter } from "./SmartReportList";
import {
  DEFAULT_QUERY_EXAMPLE,
  deriveReportStatusFromHistory,
  formatDateTime,
  indexLatestHistoryByReportId,
  type ReportRow,
  scheduleToUiValue,
} from "./smart-report/formatters";

type EditorTab = "script" | "compiled";

const INITIAL_FORM: ReportFormValues = {
  name: "",
  description: "",
  schedule: "manual",
  scheduleTime: "00:00",
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  outputFormat: "csv",
  query: DEFAULT_QUERY_EXAMPLE,
};

const SMART_REPORT_PAGE_SIZE = 20;
const REPORT_HISTORY_ENRICHMENT_LIMIT = 100;
const SMART_REPORT_DRAWER_HISTORY_LIMIT = 20;

const SmartReport: React.FC = () => {
  const isMobile = useIsMobile();
  const { message, notification } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const [reports, setReports] = useState<Report[]>([]);
  const [enrichmentHistory, setEnrichmentHistory] = useState<DownloadHistoryRecord[]>([]);
  const [drawerDownloads, setDrawerDownloads] = useState<DownloadHistoryRecord[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(SMART_REPORT_PAGE_SIZE);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportFormValues>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReportFormValues, string>>>({});

  const [scriptGateStatus, setScriptGateStatus] = useState<ScriptGateStatus>("pending");
  const [baselineScript, setBaselineScript] = useState<string | null>(null);
  const [baselineFormValues, setBaselineFormValues] = useState<EditorSnapshot | null>(null);
  const [compiledScript, setCompiledScript] = useState<string | null>(null);
  const [testRunToken, setTestRunToken] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ScriptValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testRunPreview, setTestRunPreview] = useState<{
    recordCount: number;
    durationMs: number;
    sample: Record<string, unknown>[];
    runParams?: { startDate: string; endDate: string };
  } | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("script");
  const testRunAbortRef = useRef<AbortController | null>(null);
  const scriptEditorScrollRef = useRef<HTMLDivElement | null>(null);
  const scriptScrollTopRef = useRef(0);
  const validationAlertRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef(message);
  messageRef.current = message;
  const isInitialReportsLoadRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setReportsPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const setField = <K extends keyof ReportFormValues>(key: K, value: ReportFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetScriptGate = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    setScriptGateStatus("pending");
    setBaselineScript(null);
    setBaselineFormValues(null);
    setCompiledScript(null);
    setTestRunToken(null);
    setValidationErrors([]);
    setTestRunPreview(null);
    setEditorTab("script");
  }, []);

  const scriptRequiresGate = evaluateScriptRequiresGate(editingReport, baselineScript, form.query);
  const canSaveScript = evaluateCanSaveScript(scriptRequiresGate, scriptGateStatus, testRunToken, compiledScript);
  const saveGateHint = getSaveGateHint(scriptRequiresGate, scriptGateStatus);
  const scriptGateStep = getScriptGateStep(scriptGateStatus, validationErrors.length > 0, scriptRequiresGate);
  const showGateAlert = !canSaveScript && scriptRequiresGate && Boolean(saveGateHint);
  const saveButtonTooltip = !canSaveScript && saveGateHint && !showGateAlert ? saveGateHint : undefined;

  const captureEditorSnapshot = useCallback((): EditorSnapshot => {
    return { formValues: form, script: form.query };
  }, [form]);

  const fetchEnrichmentHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const enrichRes = await listHistory({ page: 1, limit: REPORT_HISTORY_ENRICHMENT_LIMIT });
      if (signal?.aborted) return;
      setEnrichmentHistory(enrichRes.data);
    } catch (err) {
      if (signal?.aborted) return;
      messageRef.current.error(apiErrorMessage(err, "Failed to load report run history"));
    }
  }, []);

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    setReportsLoading(true);
    try {
      const reportsRes = await listReports({
        page: reportsPage,
        limit: reportsPageSize,
        q: debouncedSearch.trim() || undefined,
        enabled: enabledFilter === "all" ? undefined : enabledFilter === "enabled",
        schedule: scheduleFilter === "all" ? undefined : scheduleFilter,
      });
      if (signal?.aborted) return;
      setReports(reportsRes.data);
      setReportsTotal(reportsRes.pagination.total);
    } catch (err) {
      if (signal?.aborted) return;
      messageRef.current.error(apiErrorMessage(err, "Failed to load reports"));
    } finally {
      if (!signal?.aborted) setReportsLoading(false);
    }
  }, [reportsPage, reportsPageSize, debouncedSearch, enabledFilter, scheduleFilter]);

  const refresh = useCallback(() => {
    void fetchEnrichmentHistory();
    void fetchReports();
  }, [fetchEnrichmentHistory, fetchReports]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (isInitialReportsLoadRef.current) {
      isInitialReportsLoadRef.current = false;
      void Promise.all([fetchEnrichmentHistory(signal), fetchReports(signal)]);
    } else {
      void fetchReports(signal);
    }

    return () => controller.abort();
  }, [fetchEnrichmentHistory, fetchReports]);

  const handleReportsPaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setReportsPage(pageIndex + 1);
    setReportsPageSize(pageSize);
  }, []);

  const handleQueryScriptChange = (value: string) => {
    setField("query", value);
    if (viewMode !== "edit" || baselineScript === null) return;
    if (value !== baselineScript) {
      setScriptGateStatus("pending");
      setCompiledScript(null);
      setTestRunToken(null);
      setTestRunPreview(null);
      setValidationErrors([]);
      setEditorTab("script");
    }
  };

  const handleResetToExample = () => {
    setField("query", DEFAULT_QUERY_EXAMPLE);
    setScriptGateStatus("pending");
    setCompiledScript(null);
    setTestRunToken(null);
    setTestRunPreview(null);
    setValidationErrors([]);
    setEditorTab("script");
    notification.info({ message: "Template loaded" });
  };

  const latestRunByReportId = useMemo(() => indexLatestHistoryByReportId(enrichmentHistory), [enrichmentHistory]);

  const reportRows: ReportRow[] = useMemo(() => {
    return reports.map((report) => {
      const latest = latestRunByReportId.get(report.id);
      if (!latest) {
        return { ...report, derivedStatus: "idle", lastRun: "Never" };
      }
      return {
        ...report,
        derivedStatus: deriveReportStatusFromHistory(latest.status),
        lastRun: formatDateTime(latest.finishedAt ?? latest.startedAt),
      };
    });
  }, [reports, latestRunByReportId]);

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [validationErrors]);

  const handleRunReport = async (report: Report) => {
    setRunningId(report.id);
    const toastId = toast.loading(`Running report "${report.name}"...`);
    try {
      const record = await runReport(report.id);
      refresh();
      if (record.status === "success") {
        toast.success(`Report "${report.name}" generated and saved successfully`, { id: toastId });
      } else {
        toast.error(`Failed to run report "${report.name}". Please try again or contact support.`, { id: toastId });
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to run report"), { id: toastId });
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateNew = () => {
    setEditingReport(null);
    resetScriptGate();
    const initialValues = { ...INITIAL_FORM, query: DEFAULT_QUERY_EXAMPLE };
    setForm(initialValues);
    setFormErrors({});
    setBaselineScript(DEFAULT_QUERY_EXAMPLE);
    setBaselineFormValues({ formValues: initialValues, script: DEFAULT_QUERY_EXAMPLE });
    setViewMode("edit");
  };

  const handleEditReport = async (report: Report) => {
    setLoadingEditId(report.id);
    try {
      const detail = await getReport(report.id);
      setEditingReport(detail);
      resetScriptGate();
      const script = detail.script ?? "";
      setBaselineScript(script);
      if (detail.compiledScript) {
        setCompiledScript(detail.compiledScript);
        if (detail.validationStatus === "valid") {
          setScriptGateStatus("validated");
        }
      }
      const hour = detail.schedule?.hour ?? 0;
      const minute = detail.schedule?.minute ?? 0;
      const formValues: ReportFormValues = {
        name: detail.name,
        description: detail.description ?? "",
        schedule: scheduleToUiValue(detail.schedule),
        scheduleTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        scheduleDayOfWeek: detail.schedule?.dayOfWeek ?? 1,
        scheduleDayOfMonth: detail.schedule?.dayOfMonth ?? 1,
        outputFormat: detail.outputFormat,
        query: script,
      };
      setForm(formValues);
      setFormErrors({});
      setBaselineFormValues({ formValues, script });
      setViewMode("edit");
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to load report details"));
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleValidateScript = async () => {
    if (!form.query.trim()) {
      message.warning("Enter a query script before validating");
      return;
    }
    setIsValidating(true);
    try {
      const result = await validateReport(form.query);
      if (result.valid && result.compiledScript) {
        setCompiledScript(result.compiledScript);
        setScriptGateStatus("validated");
        setValidationErrors([]);
        setTestRunToken(null);
        setTestRunPreview(null);
        message.success("Script validated successfully");
      } else {
        setCompiledScript(null);
        setScriptGateStatus("pending");
        setValidationErrors(result.errors);
        message.error("Script validation failed");
      }
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to validate script"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestRunScript = async () => {
    if (!form.query.trim() || !compiledScript || scriptGateStatus === "pending") {
      message.warning("Validate the script before running a test");
      return;
    }
    testRunAbortRef.current?.abort();
    const controller = new AbortController();
    testRunAbortRef.current = controller;
    setIsTestRunning(true);
    try {
      const reportParams = editingReport?.params ?? {};
      const result = await testRunReport(form.query, compiledScript, reportParams, controller.signal);
      setTestRunPreview({
        recordCount: result.recordCount,
        durationMs: result.durationMs,
        sample: result.sample,
        runParams: result.runParams,
      });
      setTestRunToken(result.testRunToken);
      setScriptGateStatus("tested");
      message.success(`Test run complete — ${result.recordCount} record(s) in ${result.durationMs}ms`);
    } catch (err) {
      if (axios.isCancel(err)) {
        message.info("Test run cancelled. The server may still finish the query until its timeout.");
        return;
      }
      message.error(apiErrorMessage(err, "Test run failed"));
    } finally {
      setIsTestRunning(false);
      if (testRunAbortRef.current === controller) {
        testRunAbortRef.current = null;
      }
    }
  };

  const handleCancelTestRun = () => {
    testRunAbortRef.current?.abort();
  };

  const testRunPreviewTable = useMemo(() => buildPreviewTable(testRunPreview?.sample), [testRunPreview?.sample]);

  const testRunDateTagLabel = useMemo(
    () => getTestRunDateTagLabel(form.query, testRunPreview?.runParams),
    [form.query, testRunPreview?.runParams],
  );

  const performCancelEdit = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    setViewMode("list");
  }, []);

  const handleCancelEdit = useCallback(() => {
    const dirty = isEditorDirty(captureEditorSnapshot(), baselineFormValues);
    if (dirty) {
      void confirm({
        title: "Discard unsaved changes?",
        content: "You have unsaved changes that will be lost if you leave the editor.",
        okText: "Discard",
        danger: true,
        cancelText: "Keep editing",
        onOk: performCancelEdit,
      });
      return;
    }
    performCancelEdit();
  }, [baselineFormValues, captureEditorSnapshot, confirm, performCancelEdit]);

  const handleEditorTabChange = (value: EditorTab) => {
    if (editorTab === "script" && scriptEditorScrollRef.current) {
      const textarea = scriptEditorScrollRef.current.querySelector("textarea");
      if (textarea) scriptScrollTopRef.current = textarea.scrollTop;
    }
    setEditorTab(value);
    if (value === "script") {
      requestAnimationFrame(() => {
        const textarea = scriptEditorScrollRef.current?.querySelector("textarea");
        if (textarea) textarea.scrollTop = scriptScrollTopRef.current;
      });
    }
  };

  const validateForm = (): ReportFormValues | null => {
    const errors: Partial<Record<keyof ReportFormValues, string>> = {};
    if (!form.name.trim()) errors.name = "Please enter report name";
    if (!form.query.trim()) errors.query = "Please enter query script";
    if (form.schedule !== "manual" && !form.scheduleTime) {
      errors.scheduleTime = "Please select run time";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0 ? form : null;
  };

  const handleSaveReport = async () => {
    const values = validateForm();
    if (!values) return;

    const [hourStr, minuteStr] = values.scheduleTime.split(":");
    const hour = Number(hourStr) || 0;
    const minute = Number(minuteStr) || 0;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok";

    const payload: ReportPayload = {
      name: values.name,
      description: values.description,
      outputFormat: values.outputFormat,
      schedule:
        values.schedule === "manual"
          ? null
          : {
              frequency: values.schedule,
              hour,
              minute,
              dayOfWeek: values.schedule === "weekly" ? values.scheduleDayOfWeek : undefined,
              dayOfMonth: values.schedule === "monthly" ? values.scheduleDayOfMonth : undefined,
              timezone,
            },
    };

    if (scriptRequiresGate) {
      if (!compiledScript || !testRunToken) {
        message.warning("Validate and test-run the script before saving");
        return;
      }
      payload.script = values.query;
      payload.compiledScript = compiledScript;
      payload.testRunToken = testRunToken;
    }

    setIsSaving(true);
    try {
      if (editingReport) {
        await updateReport(editingReport.id, payload, buildEtagFromUpdDate(editingReport.upd_date));
        message.success("Report updated successfully");
      } else {
        await createReport(payload as CreateReportPayload);
        message.success("Report created successfully");
      }
      setViewMode("list");
      refresh();
    } catch (err) {
      message.error(apiErrorMessage(err, editingReport ? "Failed to update report" : "Failed to create report"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    try {
      await deleteReport(report.id, buildEtagFromUpdDate(report.upd_date));
      message.success("Report deleted successfully");
      refresh();
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to delete report"));
    }
  };

  const handleViewFiles = async (reportId: string) => {
    setSelectedReportId(reportId);
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerDownloads([]);
    try {
      const response = await listHistory({
        page: 1,
        limit: SMART_REPORT_DRAWER_HISTORY_LIMIT,
        reportId,
      });
      setDrawerDownloads(response.data);
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to load report history"));
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDownload = async (record: DownloadHistoryRecord) => {
    if (!record.fileName) return;
    try {
      await downloadReportFile(record.id, record.fileName);
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to download file"));
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;

  if (viewMode === "edit") {
    return (
      <DetailContainer
        title={editingReport?.name ?? "New report"}
        description="Configure report script, validation, and schedule."
        onBack={handleCancelEdit}
        maxWidth={null}
        className="gap-4"
        extra={
          <Tooltip>
            <TooltipTrigger
              render={
                <span>
                  <LoadingButton
                    loading={isSaving}
                    disabled={!canSaveScript}
                    onClick={() => void handleSaveReport()}
                  >
                    Save Report Script
                  </LoadingButton>
                </span>
              }
            />
            {saveButtonTooltip ? <TooltipContent>{saveButtonTooltip}</TooltipContent> : null}
          </Tooltip>
        }
      >
        <SmartReportEditor
          editingReport={editingReport}
          form={form}
          formErrors={formErrors}
          onFieldChange={setField}
          showGateAlert={showGateAlert}
          saveGateHint={saveGateHint}
          scriptGateStep={scriptGateStep}
          editorTab={editorTab}
          onEditorTabChange={handleEditorTabChange}
          compiledScript={compiledScript}
          validationErrors={validationErrors}
          isValidating={isValidating}
          isTestRunning={isTestRunning}
          scriptGateStatus={scriptGateStatus}
          testRunPreview={testRunPreview}
          testRunPreviewTable={testRunPreviewTable}
          testRunDateTagLabel={testRunDateTagLabel}
          scriptEditorScrollRef={scriptEditorScrollRef}
          validationAlertRef={validationAlertRef}
          canSaveScript={canSaveScript}
          saveButtonTooltip={saveButtonTooltip}
          isSaving={isSaving}
          onCancelEdit={handleCancelEdit}
          onSaveReport={() => void handleSaveReport()}
          onResetToExample={handleResetToExample}
          onValidateScript={() => void handleValidateScript()}
          onTestRunScript={() => void handleTestRunScript()}
          onCancelTestRun={handleCancelTestRun}
          onQueryScriptChange={handleQueryScriptChange}
          showHeader={false}
        />
      </DetailContainer>
    );
  }

  return (
    <SmartReportList
      isMobile={isMobile}
      reportRows={reportRows}
      reportsPage={reportsPage}
      reportsPageSize={reportsPageSize}
      reportsTotal={reportsTotal}
      onReportsPaginationChange={handleReportsPaginationChange}
      reportsLoading={reportsLoading}
      searchValue={rawSearch}
      onSearchChange={setRawSearch}
      enabledFilter={enabledFilter}
      onEnabledFilterChange={(value) => {
        setEnabledFilter(value);
        setReportsPage(1);
      }}
      scheduleFilter={scheduleFilter}
      onScheduleFilterChange={(value) => {
        setScheduleFilter(value);
        setReportsPage(1);
      }}
      runningId={runningId}
      loadingEditId={loadingEditId}
      isDrawerOpen={isDrawerOpen}
      onDrawerOpenChange={setIsDrawerOpen}
      drawerLoading={drawerLoading}
      selectedReport={selectedReport}
      selectedReportDownloads={drawerDownloads}
      onCreateNew={handleCreateNew}
      onRunReport={(report) => void handleRunReport(report)}
      onEditReport={(report) => void handleEditReport(report)}
      onViewFiles={(reportId) => void handleViewFiles(reportId)}
      onDeleteReport={(report) => void handleDeleteReport(report)}
      onDownload={(record) => void handleDownload(record)}
    />
  );
};

export default SmartReport;
