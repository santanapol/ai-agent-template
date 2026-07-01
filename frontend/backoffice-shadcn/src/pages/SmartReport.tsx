import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Code2,
  Download,
  FileText,
  FlaskConical,
  History,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { PageContainer, PageContentCard } from '@/components/layout';
import { DataTable } from '@/components/data-table';
import { DescriptionList } from '@/components/description-list';
import { LoadingButton } from '@/components/loading-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiErrorMessage } from '@/lib/apiError';
import {
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  runReport,
  listHistory,
  downloadReportFile,
  buildEtagFromUpdDate,
  validateReport,
  testRunReport,
} from '@/lib/smartReportApiClient';
import type {
  Report,
  DownloadHistoryRecord,
  ReportPayload,
  CreateReportPayload,
  ScriptValidationError,
} from '@/types/smartReport';
import {
  buildPreviewTable,
  canSaveScript as evaluateCanSaveScript,
  formatTestRunPreviewCount,
  getSaveGateHint,
  getScriptGateStep,
  getTestRunDateTagLabel,
  isEditorDirty,
  scriptRequiresGate as evaluateScriptRequiresGate,
  type EditorSnapshot,
  type ScriptGateStatus,
} from '@/lib/smartReportScriptGate';
import {
  DEFAULT_QUERY_EXAMPLE,
  formatDateTime,
  formatScheduleLabel,
  formatValidationStatusLabel,
  scheduleToUiValue,
  type ReportRow,
  type ReportStatus,
  type ScheduleOption,
} from './smartReport/formatters';
import { cn } from '@/lib/utils';

type EditorTab = 'script' | 'compiled';

type ReportFormValues = {
  name: string;
  description: string;
  schedule: ScheduleOption;
  scheduleTime: string;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number | 'last';
  outputFormat: 'csv' | 'excel';
  query: string;
};

const INITIAL_FORM: ReportFormValues = {
  name: '',
  description: '',
  schedule: 'manual',
  scheduleTime: '00:00',
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  outputFormat: 'csv',
  query: DEFAULT_QUERY_EXAMPLE,
};

function validationBadgeVariant(status: Report['validationStatus'] | undefined) {
  if (status === 'valid') return 'default' as const;
  if (status === 'invalid') return 'destructive' as const;
  return 'secondary' as const;
}

function derivedStatusBadge(status: ReportStatus) {
  if (status === 'running') return <Badge variant="secondary">Running</Badge>;
  if (status === 'completed') return <Badge>Completed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">Idle</Badge>;
}

function GateSteps({
  current,
  validateStatus,
}: {
  current: number;
  validateStatus?: 'wait' | 'process' | 'finish' | 'error';
}) {
  const steps = ['Edit script', 'Validate', 'Test run', 'Save'];
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm">
      {steps.map((label, index) => {
        const isCurrent = index === current;
        const isPast = index < current;
        const isValidate = index === 1 && validateStatus === 'error';
        return (
          <li
            key={label}
            className={cn(
              'rounded-full border px-3 py-1',
              isCurrent && 'border-primary bg-primary/10 font-medium',
              isPast && 'text-muted-foreground',
              isValidate && 'border-destructive text-destructive',
            )}
          >
            {label}
          </li>
        );
      })}
    </ol>
  );
}

const SmartReport: React.FC = () => {
  const isMobile = useIsMobile();
  const { message, notification } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState('reports');

  const [reports, setReports] = useState<Report[]>([]);
  const [history, setHistory] = useState<DownloadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportFormValues>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReportFormValues, string>>>({});

  const [scriptGateStatus, setScriptGateStatus] = useState<ScriptGateStatus>('pending');
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
  const [editorTab, setEditorTab] = useState<EditorTab>('script');
  const testRunAbortRef = useRef<AbortController | null>(null);
  const scriptEditorScrollRef = useRef<HTMLDivElement | null>(null);
  const scriptScrollTopRef = useRef(0);
  const validationAlertRef = useRef<HTMLDivElement | null>(null);

  const setField = <K extends keyof ReportFormValues>(key: K, value: ReportFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetScriptGate = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    setScriptGateStatus('pending');
    setBaselineScript(null);
    setBaselineFormValues(null);
    setCompiledScript(null);
    setTestRunToken(null);
    setValidationErrors([]);
    setTestRunPreview(null);
    setEditorTab('script');
  }, []);

  const scriptRequiresGate = evaluateScriptRequiresGate(editingReport, baselineScript, form.query);
  const canSaveScript = evaluateCanSaveScript(
    scriptRequiresGate,
    scriptGateStatus,
    testRunToken,
    compiledScript,
  );
  const saveGateHint = getSaveGateHint(scriptRequiresGate, scriptGateStatus);
  const scriptGateStep = getScriptGateStep(
    scriptGateStatus,
    validationErrors.length > 0,
    scriptRequiresGate,
  );
  const showGateAlert = !canSaveScript && scriptRequiresGate && Boolean(saveGateHint);
  const saveButtonTooltip =
    !canSaveScript && saveGateHint && !showGateAlert ? saveGateHint : undefined;

  const captureEditorSnapshot = useCallback((): EditorSnapshot => {
    return { formValues: form, script: form.query };
  }, [form]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [reportsRes, historyRes] = await Promise.all([
          listReports({ limit: 200 }),
          listHistory({ limit: 200 }),
        ]);
        if (cancelled) return;
        setReports(reportsRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'Failed to load report data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [message, refreshToken]);

  const handleQueryScriptChange = (value: string) => {
    setField('query', value);
    if (viewMode !== 'edit' || baselineScript === null) return;
    if (value !== baselineScript) {
      setScriptGateStatus('pending');
      setCompiledScript(null);
      setTestRunToken(null);
      setTestRunPreview(null);
      setValidationErrors([]);
      setEditorTab('script');
    }
  };

  const handleResetToExample = () => {
    setField('query', DEFAULT_QUERY_EXAMPLE);
    setScriptGateStatus('pending');
    setCompiledScript(null);
    setTestRunToken(null);
    setTestRunPreview(null);
    setValidationErrors([]);
    setEditorTab('script');
    notification.info({ message: 'Template loaded' });
  };

  const reportRows: ReportRow[] = useMemo(() => {
    return reports.map((report) => {
      const latest = history.find((h) => h.reportId === report.id);
      if (!latest) {
        return { ...report, derivedStatus: 'idle', lastRun: '—' };
      }
      const lastRun = formatDateTime(latest.finishedAt ?? latest.startedAt);
      const derivedStatus: ReportStatus =
        latest.status === 'running'
          ? 'running'
          : latest.status === 'success'
            ? 'completed'
            : 'failed';
      return { ...report, derivedStatus, lastRun };
    });
  }, [reports, history]);

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [validationErrors]);

  const handleRunReport = async (report: Report) => {
    setRunningId(report.id);
    const toastId = toast.loading(`Running report "${report.name}"...`);
    try {
      const record = await runReport(report.id);
      refresh();
      if (record.status === 'success') {
        toast.success(`Report "${report.name}" generated and saved successfully`, { id: toastId });
      } else {
        toast.error(
          `Failed to run report "${report.name}": ${record.error ?? 'Unknown error'}`,
          { id: toastId },
        );
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to run report'), { id: toastId });
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
    setViewMode('edit');
  };

  const handleEditReport = async (report: Report) => {
    setLoadingEditId(report.id);
    try {
      const detail = await getReport(report.id);
      setEditingReport(detail);
      resetScriptGate();
      const script = detail.script ?? '';
      setBaselineScript(script);
      if (detail.compiledScript) {
        setCompiledScript(detail.compiledScript);
        if (detail.validationStatus === 'valid') {
          setScriptGateStatus('validated');
        }
      }
      const hour = detail.schedule?.hour ?? 0;
      const minute = detail.schedule?.minute ?? 0;
      const formValues: ReportFormValues = {
        name: detail.name,
        description: detail.description ?? '',
        schedule: scheduleToUiValue(detail.schedule),
        scheduleTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        scheduleDayOfWeek: detail.schedule?.dayOfWeek ?? 1,
        scheduleDayOfMonth: detail.schedule?.dayOfMonth ?? 1,
        outputFormat: detail.outputFormat,
        query: script,
      };
      setForm(formValues);
      setFormErrors({});
      setBaselineFormValues({ formValues, script });
      setViewMode('edit');
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to load report details'));
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleValidateScript = async () => {
    if (!form.query.trim()) {
      message.warning('Enter a query script before validating');
      return;
    }
    setIsValidating(true);
    try {
      const result = await validateReport(form.query);
      if (result.valid && result.compiledScript) {
        setCompiledScript(result.compiledScript);
        setScriptGateStatus('validated');
        setValidationErrors([]);
        setTestRunToken(null);
        setTestRunPreview(null);
        message.success('Script validated successfully');
      } else {
        setCompiledScript(null);
        setScriptGateStatus('pending');
        setValidationErrors(result.errors);
        message.error('Script validation failed');
      }
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to validate script'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestRunScript = async () => {
    if (!form.query.trim() || !compiledScript || scriptGateStatus === 'pending') {
      message.warning('Validate the script before running a test');
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
      setScriptGateStatus('tested');
      message.success(
        `Test run complete — ${result.recordCount} record(s) in ${result.durationMs}ms`,
      );
    } catch (err) {
      if (axios.isCancel(err)) {
        message.info(
          'Test run cancelled. The server may still finish the query until its timeout.',
        );
        return;
      }
      message.error(apiErrorMessage(err, 'Test run failed'));
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

  const testRunPreviewTable = useMemo(
    () => buildPreviewTable(testRunPreview?.sample),
    [testRunPreview?.sample],
  );

  const testRunDateTagLabel = useMemo(
    () => getTestRunDateTagLabel(form.query, testRunPreview?.runParams),
    [form.query, testRunPreview?.runParams],
  );

  const performCancelEdit = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    setViewMode('list');
  }, []);

  const handleCancelEdit = useCallback(() => {
    const dirty = isEditorDirty(captureEditorSnapshot(), baselineFormValues);
    if (dirty) {
      void confirm({
        title: 'Discard unsaved changes?',
        content: 'You have unsaved changes that will be lost if you leave the editor.',
        okText: 'Discard',
        danger: true,
        cancelText: 'Keep editing',
        onOk: performCancelEdit,
      });
      return;
    }
    performCancelEdit();
  }, [baselineFormValues, captureEditorSnapshot, confirm, performCancelEdit]);

  const handleEditorTabChange = (value: EditorTab) => {
    if (editorTab === 'script' && scriptEditorScrollRef.current) {
      const textarea = scriptEditorScrollRef.current.querySelector('textarea');
      if (textarea) scriptScrollTopRef.current = textarea.scrollTop;
    }
    setEditorTab(value);
    if (value === 'script') {
      requestAnimationFrame(() => {
        const textarea = scriptEditorScrollRef.current?.querySelector('textarea');
        if (textarea) textarea.scrollTop = scriptScrollTopRef.current;
      });
    }
  };

  const validateForm = (): ReportFormValues | null => {
    const errors: Partial<Record<keyof ReportFormValues, string>> = {};
    if (!form.name.trim()) errors.name = 'Please enter report name';
    if (!form.query.trim()) errors.query = 'Please enter query script';
    if (form.schedule !== 'manual' && !form.scheduleTime) {
      errors.scheduleTime = 'Please select run time';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0 ? form : null;
  };

  const handleSaveReport = async () => {
    const values = validateForm();
    if (!values) return;

    const [hourStr, minuteStr] = values.scheduleTime.split(':');
    const hour = Number(hourStr) || 0;
    const minute = Number(minuteStr) || 0;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';

    const payload: ReportPayload = {
      name: values.name,
      description: values.description,
      outputFormat: values.outputFormat,
      schedule:
        values.schedule === 'manual'
          ? null
          : {
              frequency: values.schedule,
              hour,
              minute,
              dayOfWeek: values.schedule === 'weekly' ? values.scheduleDayOfWeek : undefined,
              dayOfMonth: values.schedule === 'monthly' ? values.scheduleDayOfMonth : undefined,
              timezone,
            },
    };

    if (scriptRequiresGate) {
      if (!compiledScript || !testRunToken) {
        message.warning('Validate and test-run the script before saving');
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
        message.success('Report updated successfully');
      } else {
        await createReport(payload as CreateReportPayload);
        message.success('Report created successfully');
      }
      setViewMode('list');
      refresh();
    } catch (err) {
      message.error(
        apiErrorMessage(err, editingReport ? 'Failed to update report' : 'Failed to create report'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = (report: Report) => {
    void confirm({
      title: 'Confirm Delete Report',
      content: `Are you sure you want to delete report "${report.name}"? This script will be permanently deleted, but previously generated report files will remain on the server.`,
      okText: 'Delete Report',
      danger: true,
      onOk: async () => {
        try {
          await deleteReport(report.id, buildEtagFromUpdDate(report.upd_date));
          message.success('Report deleted successfully');
          refresh();
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to delete report'));
          throw err;
        }
      },
    });
  };

  const handleViewFiles = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsDrawerOpen(true);
  };

  const handleDownload = async (record: DownloadHistoryRecord) => {
    if (!record.fileName) return;
    try {
      await downloadReportFile(record.id, record.fileName);
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to download file'));
    }
  };

  const selectedReportDownloads = history.filter((d) => d.reportId === selectedReportId);
  const selectedReportName = reports.find((r) => r.id === selectedReportId)?.name || '';

  if (viewMode === 'edit') {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancelEdit();
                  }}
                >
                  Smart Report
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{editingReport ? editingReport.name : 'New report'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
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
          </div>
        </div>

        {showGateAlert ? (
          <Alert className="mb-4" variant="default">
            <AlertTitle>Save blocked</AlertTitle>
            <AlertDescription>{saveGateHint}</AlertDescription>
          </Alert>
        ) : null}

        <GateSteps
          current={scriptGateStep.current}
          validateStatus={scriptGateStep.validateStatus}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                General Info & Scheduler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!formErrors.name}>
                  <FieldLabel htmlFor="report-name">Report Name</FieldLabel>
                  <Input
                    id="report-name"
                    value={form.name}
                    placeholder="e.g. Active Staff Login Analytics Report"
                    onChange={(e) => setField('name', e.target.value)}
                  />
                  {formErrors.name ? <FieldError>{formErrors.name}</FieldError> : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="report-description">Description</FieldLabel>
                  <Input
                    id="report-description"
                    value={form.description}
                    placeholder="Specify report purpose and data schema"
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Output Format</FieldLabel>
                  <div className="flex rounded-lg border p-1">
                    {(['csv', 'excel'] as const).map((fmt) => (
                      <Button
                        key={fmt}
                        type="button"
                        variant={form.outputFormat === fmt ? 'secondary' : 'ghost'}
                        className="flex-1"
                        onClick={() => setField('outputFormat', fmt)}
                      >
                        {fmt === 'csv' ? 'CSV (.csv)' : 'Excel (.xlsx)'}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="schedule">Schedule Frequency</FieldLabel>
                  <Select
                    value={form.schedule}
                    onValueChange={(value) => setField('schedule', value as ScheduleOption)}
                  >
                    <SelectTrigger id="schedule" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.schedule !== 'manual' ? (
                  <>
                    {form.schedule === 'weekly' ? (
                      <Field>
                        <FieldLabel htmlFor="schedule-dow">Run Day</FieldLabel>
                        <Select
                          value={String(form.scheduleDayOfWeek)}
                          onValueChange={(value) =>
                            setField('scheduleDayOfWeek', Number(value))
                          }
                        >
                          <SelectTrigger id="schedule-dow" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                            <SelectItem value="0">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : null}
                    {form.schedule === 'monthly' ? (
                      <Field>
                        <FieldLabel htmlFor="schedule-dom">Run Day</FieldLabel>
                        <Select
                          value={String(form.scheduleDayOfMonth)}
                          onValueChange={(value) =>
                            setField(
                              'scheduleDayOfMonth',
                              value === 'last' ? 'last' : Number(value),
                            )
                          }
                        >
                          <SelectTrigger id="schedule-dom" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="last">Last day of month</SelectItem>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                Day {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : null}
                    <Field data-invalid={!!formErrors.scheduleTime}>
                      <FieldLabel htmlFor="schedule-time">Run Time</FieldLabel>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={form.scheduleTime}
                        onChange={(e) => setField('scheduleTime', e.target.value)}
                      />
                      {formErrors.scheduleTime ? (
                        <FieldError>{formErrors.scheduleTime}</FieldError>
                      ) : null}
                    </Field>
                  </>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="size-4 text-primary" />
                Query Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 bg-muted/30 px-3 py-2">
                <Tabs
                  value={editorTab}
                  onValueChange={(value) => handleEditorTabChange(value as EditorTab)}
                >
                  <TabsList>
                    <TabsTrigger value="script">Script</TabsTrigger>
                    <TabsTrigger value="compiled" disabled={!compiledScript}>
                      Compiled
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex flex-wrap gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                      <RotateCcw data-icon="inline-start" />
                      Reset to Example
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset to example template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your current script will be replaced with the default example.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleResetToExample}>
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    loading={isValidating}
                    onClick={() => void handleValidateScript()}
                  >
                    <CheckCircle2 data-icon="inline-start" />
                    Validate
                  </LoadingButton>
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    loading={isTestRunning}
                    disabled={scriptGateStatus === 'pending' || !compiledScript || isTestRunning}
                    onClick={() => void handleTestRunScript()}
                  >
                    <FlaskConical data-icon="inline-start" />
                    Test Run
                  </LoadingButton>
                  {isTestRunning ? (
                    <Button size="sm" variant="destructive" onClick={handleCancelTestRun}>
                      <Square data-icon="inline-start" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>

              {editorTab === 'script' ? (
                <div ref={scriptEditorScrollRef}>
                  <Field data-invalid={!!formErrors.query}>
                    <Textarea
                      value={form.query}
                      onChange={(e) => handleQueryScriptChange(e.target.value)}
                      className="min-h-[280px] rounded-t-none font-mono text-xs"
                      placeholder="// Query example..."
                    />
                    {formErrors.query ? <FieldError>{formErrors.query}</FieldError> : null}
                  </Field>
                </div>
              ) : (
                <Textarea
                  readOnly
                  value={compiledScript ?? ''}
                  className="min-h-[280px] rounded-t-none font-mono text-xs"
                />
              )}

              {validationErrors.length > 0 ? (
                <div ref={validationAlertRef} className="mt-4">
                  <Alert variant="destructive">
                    <AlertTitle>Validation errors</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 space-y-1">
                        {validationErrors.map((err, index) => (
                          <li key={index} className="font-mono text-xs">
                            {err.line != null ? `Line ${err.line}: ` : ''}
                            {err.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}

              <Collapsible className="mt-4">
                <CollapsibleTrigger className="text-sm font-medium text-primary">
                  Script workflow
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Validate compiles without querying the database.</li>
                    <li>
                      Test run uses yesterday&apos;s params.startDate / params.endDate when
                      referenced.
                    </li>
                    <li>Save unlocks after a successful test run when the script changed.</li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {testRunPreview ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="size-4 text-primary" />
                Test run preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scriptGateStatus === 'tested' ? (
                <Alert className="mb-4">
                  <AlertTitle>Test run succeeded</AlertTitle>
                </Alert>
              ) : null}
              <DescriptionList
                items={[
                  ...(testRunDateTagLabel
                    ? [{ label: 'Date range', value: testRunDateTagLabel }]
                    : []),
                  {
                    label: 'Records',
                    value: formatTestRunPreviewCount(
                      testRunPreview.recordCount,
                      testRunPreview.sample.length,
                    ),
                  },
                  { label: 'Duration', value: `${testRunPreview.durationMs}ms` },
                ]}
              />
              {testRunPreviewTable.rows.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {testRunPreviewTable.columns.map((col) => (
                          <th key={col.key} className="px-3 py-2 text-left font-medium">
                            {col.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {testRunPreviewTable.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0">
                          {testRunPreviewTable.columns.map((col) => (
                            <td key={col.key} className="px-3 py-2">
                              {String(row[col.dataIndex as string] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : testRunPreview.recordCount > 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {testRunPreview.recordCount} record(s) returned — preview rows could not be
                  displayed.
                </p>
              ) : (
                <Empty className="mt-4">
                  <EmptyHeader>
                    <EmptyTitle>No rows</EmptyTitle>
                    <EmptyDescription>
                      {testRunDateTagLabel
                        ? `Query returned no rows for ${testRunDateTagLabel}`
                        : 'Query returned no rows'}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  const reportColumns = [
    {
      key: 'name',
      title: 'Report',
      render: (record: ReportRow) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium">{record.name}</span>
            {record.enabled === false ? <Badge variant="outline">Disabled</Badge> : null}
            <Badge variant={validationBadgeVariant(record.validationStatus)}>
              {formatValidationStatusLabel(record.validationStatus)}
            </Badge>
            {record.lastTestRunMeta?.recordCount != null ? (
              <Badge variant="secondary">Test: {record.lastTestRunMeta.recordCount}</Badge>
            ) : null}
          </div>
          {record.description ? (
            <p className="truncate text-xs text-muted-foreground">{record.description}</p>
          ) : null}
          {isMobile ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatScheduleLabel(record.schedule)}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(!isMobile
      ? [
          {
            key: 'schedule',
            title: 'Schedule',
            render: (record: ReportRow) => (
              <span className="flex items-center gap-1 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                {formatScheduleLabel(record.schedule)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'outputFormat',
      title: 'Output Format',
      render: (record: ReportRow) => (
        <Badge variant={record.outputFormat === 'csv' ? 'secondary' : 'default'}>
          {record.outputFormat.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (record: ReportRow) => derivedStatusBadge(record.derivedStatus),
    },
    {
      key: 'lastRun',
      title: 'Last Run',
      render: (record: ReportRow) => (
        <span className="text-xs text-muted-foreground">{record.lastRun}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (record: ReportRow) => (
        <div className="flex flex-wrap gap-1">
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Run report"
                        disabled={
                          record.derivedStatus === 'running' || runningId === record.id
                        }
                      />
                    }
                  />
                }
              >
                {runningId === record.id ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>Run report</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run this report now?</AlertDialogTitle>
                <AlertDialogDescription>
                  Heavy queries may take several minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleRunReport(record)}>
                  Run
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Edit report"
                  disabled={
                    record.derivedStatus === 'running' ||
                    (loadingEditId !== null && loadingEditId !== record.id)
                  }
                  onClick={() => void handleEditReport(record)}
                />
              }
            >
              {loadingEditId === record.id ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Pencil className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>Edit report</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="View download history"
                  onClick={() => handleViewFiles(record.id)}
                />
              }
            >
              <History className="size-4" />
            </TooltipTrigger>
            <TooltipContent>View download history</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Delete report"
                  disabled={record.derivedStatus === 'running'}
                  onClick={() => handleDeleteReport(record)}
                />
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>Delete report</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  const downloadColumns = [
    {
      key: 'reportName',
      title: 'Report Name',
      render: (record: DownloadHistoryRecord) => (
        <span className="flex items-center gap-2 font-medium">
          <FileText className="size-4 text-primary" />
          {record.reportName}
        </span>
      ),
    },
    {
      key: 'startedAt',
      title: 'Generated At',
      render: (record: DownloadHistoryRecord) =>
        formatDateTime(record.finishedAt ?? record.startedAt),
    },
    {
      key: 'format',
      title: 'File Type',
      render: (record: DownloadHistoryRecord) => (
        <Badge variant={record.format === 'csv' ? 'secondary' : 'default'}>
          {record.format.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (record: DownloadHistoryRecord) => {
        if (record.status === 'success') return <Badge>Success</Badge>;
        if (record.status === 'failed') return <Badge variant="destructive">Failed</Badge>;
        return <Badge variant="secondary">Running</Badge>;
      },
    },
    {
      key: 'download',
      title: 'Download',
      render: (record: DownloadHistoryRecord) => (
        <Button
          size="sm"
          disabled={record.status !== 'success' || !record.fileName}
          onClick={() => void handleDownload(record)}
        >
          <Download data-icon="inline-start" />
          Download
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Smart Report"
      description="Automated reporting and scheduling system. Fetches data directly via a read-only database replica."
      extra={
        <Button size="lg" onClick={handleCreateNew}>
          <Plus data-icon="inline-start" />
          Create New Report
        </Button>
      }
    >
      <Alert className="mb-6 border-info/30 bg-info/5">
        <Code2 className="size-5" />
        <AlertTitle>Secure Read-Only Access</AlertTitle>
        <AlertDescription>
          All reports run on secondary database replicas in read-only mode. Heavy queries or
          aggregation pipelines can be executed safely without affecting the main transactional
          server performance.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">
            <Code2 data-icon="inline-start" />
            Report Scripts
          </TabsTrigger>
          <TabsTrigger value="history">
            <History data-icon="inline-start" />
            Download History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4">
          <PageContentCard>
            <DataTable
              columns={reportColumns}
              data={reportRows}
              loading={loading}
              rowKey="id"
              pageSize={10}
            />
          </PageContentCard>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PageContentCard>
            <DataTable
              columns={downloadColumns}
              data={history}
              loading={loading}
              rowKey="id"
              pageSize={10}
            />
          </PageContentCard>
        </TabsContent>
      </Tabs>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className={isMobile ? 'w-full' : 'sm:max-w-xl'}>
          <SheetHeader>
            <SheetTitle>Download History: {selectedReportName}</SheetTitle>
          </SheetHeader>
          {selectedReportDownloads.length > 0 ? (
            <div className="mt-4">
              <DataTable
                columns={[
                  {
                    key: 'startedAt',
                    title: 'Run Date',
                    render: (rec: DownloadHistoryRecord) =>
                      formatDateTime(rec.finishedAt ?? rec.startedAt),
                  },
                  {
                    key: 'format',
                    title: 'File Type',
                    render: (rec: DownloadHistoryRecord) => (
                      <Badge variant={rec.format === 'csv' ? 'secondary' : 'default'}>
                        {rec.format.toUpperCase()}
                      </Badge>
                    ),
                  },
                  {
                    key: 'status',
                    title: 'Status',
                    render: (rec: DownloadHistoryRecord) => {
                      if (rec.status === 'success') return <Badge>Success</Badge>;
                      if (rec.status === 'failed') return <Badge variant="destructive">Failed</Badge>;
                      return <Badge variant="secondary">Running</Badge>;
                    },
                  },
                  {
                    key: 'dl',
                    title: 'Download',
                    render: (rec: DownloadHistoryRecord) => (
                      <Button
                        size="sm"
                        disabled={rec.status !== 'success' || !rec.fileName}
                        onClick={() => void handleDownload(rec)}
                      >
                        <Download data-icon="inline-start" />
                        Download
                      </Button>
                    ),
                  },
                ]}
                data={selectedReportDownloads}
                rowKey="id"
                pageSize={8}
              />
            </div>
          ) : (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyTitle>No history</EmptyTitle>
                <EmptyDescription>
                  No execution history or saved files for this script.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
};

export default SmartReport;
