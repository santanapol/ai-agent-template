import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";

import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiErrorMessage } from "@/lib/apiError";
import {
  buildEtagFromUpdDate,
  createReport,
  getReport,
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
import { useNavigate, useParams } from "@/navigation/compat";
import type { CreateReportPayload, Report, ReportPayload, ScriptValidationError } from "@/types/smartReport";

import type { ReportFormValues } from "../SmartReportEditor";
import { DEFAULT_QUERY_EXAMPLE, scheduleToUiValue } from "./formatters";
import { getEditorPageDescription, getEditorSaveLabel, type SmartReportEditorMode } from "./editorCopy";

export type EditorTab = "script" | "compiled";
export type { SmartReportEditorMode } from "./editorCopy";

export const INITIAL_FORM: ReportFormValues = {
  name: "",
  description: "",
  schedule: "manual",
  scheduleTime: "00:00",
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  outputFormat: "csv",
  query: "",
};

function reportToFormValues(detail: Report): ReportFormValues {
  const script = detail.script ?? "";
  const hour = detail.schedule?.hour ?? 0;
  const minute = detail.schedule?.minute ?? 0;
  return {
    name: detail.name,
    description: detail.description ?? "",
    schedule: scheduleToUiValue(detail.schedule),
    scheduleTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    scheduleDayOfWeek: detail.schedule?.dayOfWeek ?? 1,
    scheduleDayOfMonth: detail.schedule?.dayOfMonth ?? 1,
    outputFormat: detail.outputFormat,
    query: script,
  };
}

export function useSmartReportEditor(mode: SmartReportEditorMode) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, notification } = useAppFeedback();
  const { confirm } = useConfirmDialog();

  const [pageLoading, setPageLoading] = useState(mode === "edit");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
  const testRunPreviewRef = useRef<HTMLDivElement | null>(null);

  const setField = useCallback(<K extends keyof ReportFormValues>(key: K, value: ReportFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

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

  const initializeCreate = useCallback(() => {
    resetScriptGate();
    const initialValues = { ...INITIAL_FORM };
    setEditingReport(null);
    setForm(initialValues);
    setFormErrors({});
    setBaselineScript("");
    setBaselineFormValues({ formValues: initialValues, script: "" });
    setPageLoading(false);
  }, [resetScriptGate]);

  const applyLoadedReport = useCallback(
    (detail: Report) => {
      resetScriptGate();
      const script = detail.script ?? "";
      setEditingReport(detail);
      setBaselineScript(script);
      if (detail.compiledScript) {
        setCompiledScript(detail.compiledScript);
        if (detail.validationStatus === "valid") {
          setScriptGateStatus("validated");
        }
      }
      const formValues = reportToFormValues(detail);
      setForm(formValues);
      setFormErrors({});
      setBaselineFormValues({ formValues, script });
    },
    [resetScriptGate],
  );

  useEffect(() => {
    if (mode === "create") {
      initializeCreate();
      return;
    }

    if (!id) {
      message.error("Report not found");
      navigate("/smart-reports");
      return;
    }

    let cancelled = false;
    void (async () => {
      setPageLoading(true);
      try {
        const detail = await getReport(id);
        if (cancelled) return;
        applyLoadedReport(detail);
      } catch (err) {
        if (cancelled) return;
        message.error(apiErrorMessage(err, "Failed to load report details"));
        navigate("/smart-reports");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, id, initializeCreate, applyLoadedReport, message, navigate]);

  const scriptRequiresGate = evaluateScriptRequiresGate(editingReport, baselineScript, form.query);
  const canSaveScript = evaluateCanSaveScript(scriptRequiresGate, scriptGateStatus, testRunToken, compiledScript);
  const saveGateHint = getSaveGateHint(scriptRequiresGate, scriptGateStatus);
  const scriptGateStep = getScriptGateStep(scriptGateStatus, validationErrors.length > 0, scriptRequiresGate);

  const captureEditorSnapshot = useCallback((): EditorSnapshot => {
    return { formValues: form, script: form.query };
  }, [form]);

  const isDirty = useMemo(
    () => isEditorDirty(captureEditorSnapshot(), baselineFormValues),
    [baselineFormValues, captureEditorSnapshot],
  );

  const canSaveReport = canSaveScript && isDirty;
  const saveButtonTooltip = !canSaveReport
    ? (saveGateHint ?? (!isDirty ? "No changes to save" : null))
    : undefined;

  const testRunPreviewTable = useMemo(() => buildPreviewTable(testRunPreview?.sample), [testRunPreview?.sample]);

  const testRunDateTagLabel = useMemo(
    () => getTestRunDateTagLabel(form.query, testRunPreview?.runParams),
    [form.query, testRunPreview?.runParams],
  );

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [validationErrors]);

  useEffect(() => {
    if (testRunPreview) {
      testRunPreviewRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }
  }, [testRunPreview]);

  const handleQueryScriptChange = useCallback(
    (value: string) => {
      setField("query", value);
      if (baselineScript === null) return;
      if (value !== baselineScript) {
        setScriptGateStatus("pending");
        setCompiledScript(null);
        setTestRunToken(null);
        setTestRunPreview(null);
        setValidationErrors([]);
        setEditorTab("script");
      }
    },
    [baselineScript, setField],
  );

  const handleResetToExample = useCallback(() => {
    setField("query", DEFAULT_QUERY_EXAMPLE);
    setScriptGateStatus("pending");
    setCompiledScript(null);
    setTestRunToken(null);
    setTestRunPreview(null);
    setValidationErrors([]);
    setEditorTab("script");
    notification.info({ message: "Template loaded" });
  }, [notification, setField]);

  const handleValidateScript = useCallback(async () => {
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
  }, [form.query, message]);

  const handleTestRunScript = useCallback(async () => {
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
  }, [compiledScript, editingReport?.params, form.query, message, scriptGateStatus]);

  const handleCancelTestRun = useCallback(() => {
    testRunAbortRef.current?.abort();
  }, []);

  const handleEditorTabChange = useCallback(
    (value: EditorTab) => {
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
    },
    [editorTab],
  );

  const validateForm = useCallback((): ReportFormValues | null => {
    const errors: Partial<Record<keyof ReportFormValues, string>> = {};
    if (!form.name.trim()) errors.name = "Please enter report name";
    if (!form.query.trim()) errors.query = "Please enter query script";
    if (form.schedule !== "manual" && !form.scheduleTime) {
      errors.scheduleTime = "Please select run time";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0 ? form : null;
  }, [form]);

  const handleSaveReport = useCallback(async () => {
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
      navigate("/smart-reports");
    } catch (err) {
      message.error(apiErrorMessage(err, editingReport ? "Failed to update report" : "Failed to create report"));
    } finally {
      setIsSaving(false);
    }
  }, [compiledScript, editingReport, message, navigate, scriptRequiresGate, testRunToken, validateForm]);

  const performLeave = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    navigate("/smart-reports");
  }, [navigate]);

  const handleLeave = useCallback(() => {
    const dirty = isEditorDirty(captureEditorSnapshot(), baselineFormValues);
    if (dirty) {
      void confirm({
        title: "Discard unsaved changes?",
        content: "You have unsaved changes that will be lost if you leave the editor.",
        okText: "Discard",
        danger: true,
        cancelText: "Keep editing",
        onOk: performLeave,
      });
      return;
    }
    performLeave();
  }, [baselineFormValues, captureEditorSnapshot, confirm, performLeave]);

  const pageTitle = form.name.trim() || "New report";
  const pageDescription = getEditorPageDescription(
    mode,
    scriptGateStatus,
    form.description,
    scriptRequiresGate,
  );
  const saveButtonLabel = getEditorSaveLabel(mode);

  return {
    mode,
    pageLoading,
    pageTitle,
    pageDescription,
    saveButtonLabel,
    editingReport,
    form,
    formErrors,
    setField,
    scriptGateStatus,
    scriptGateStep,
    saveGateHint,
    canSaveScript,
    canSaveReport,
    isDirty,
    scriptRequiresGate,
    saveButtonTooltip,
    editorTab,
    compiledScript,
    validationErrors,
    isValidating,
    isTestRunning,
    testRunPreview,
    testRunPreviewTable,
    testRunDateTagLabel,
    scriptEditorScrollRef,
    validationAlertRef,
    testRunPreviewRef,
    isSaving,
    handleLeave,
    handleSaveReport,
    handleResetToExample,
    handleValidateScript,
    handleTestRunScript,
    handleCancelTestRun,
    handleEditorTabChange,
    handleQueryScriptChange,
    applyLoadedReport,
    initializeCreate,
  };
}
