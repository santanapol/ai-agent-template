import type { ColumnsType } from 'antd/es/table';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Tabs,
  Form,
  Input,
  Select,
  Tooltip,
  Badge,
  theme,
  Drawer,
  Empty,
  Segmented,
  TimePicker,
  Row,
  Col,
  Alert,
  List,
  Steps,
  Breadcrumb,
  Popconfirm,
  Descriptions,
  Grid,
  Collapse,
} from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import {
  FileTextOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useAppFeedback } from '../hooks/useAppFeedback';
import { apiErrorMessage } from '../lib/apiError';
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
} from '../lib/smartReportApiClient';
import type {
  Report,
  DownloadHistoryRecord,
  ReportPayload,
  CreateReportPayload,
  ScriptValidationError,
} from '../types/smartReport';
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
} from '../lib/smartReportScriptGate';
import {
  DEFAULT_QUERY_EXAMPLE,
  formatDateTime,
  formatScheduleLabel,
  formatValidationStatusLabel,
  scheduleToUiValue,
  validationStatusColor,
  type ReportRow,
  type ReportStatus,
  type ScheduleOption,
} from './smartReport/formatters';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type EditorTab = 'script' | 'compiled';

const SmartReport: React.FC = () => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const { message, modal, notification } = useAppFeedback();
  const [activeTab, setActiveTab] = useState('reports');

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [history, setHistory] = useState<DownloadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  // UI Control States
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const scheduleValue = Form.useWatch('schedule', form);
  const queryValue = Form.useWatch('query', form);

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

  const scriptRequiresGate = evaluateScriptRequiresGate(
    editingReport,
    baselineScript,
    queryValue,
  );

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
    return {
      formValues: form.getFieldsValue(),
      script: (form.getFieldValue('query') as string | undefined) ?? '',
    };
  }, [form]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  // Load reports + download history together
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
    load();
    return () => {
      cancelled = true;
    };
  }, [message, refreshToken]);

  const handleQueryScriptChange = (value: string) => {
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
    form.setFieldsValue({ query: DEFAULT_QUERY_EXAMPLE });
    setScriptGateStatus('pending');
    setCompiledScript(null);
    setTestRunToken(null);
    setTestRunPreview(null);
    setValidationErrors([]);
    setEditorTab('script');
    notification.info({
      message: 'Template loaded',
      placement: 'bottomRight',
      duration: 2,
    });
  };

  // Combine report definitions with their latest run (history is sorted newest-first)
  const reportRows: ReportRow[] = useMemo(() => {
    return reports.map((report) => {
      const latest = history.find((h) => h.reportId === report.id);
      if (!latest) {
        return { ...report, derivedStatus: 'idle', lastRun: '—' };
      }
      const lastRun = formatDateTime(latest.finishedAt ?? latest.startedAt);
      const derivedStatus: ReportStatus =
        latest.status === 'running' ? 'running' : latest.status === 'success' ? 'completed' : 'failed';
      return { ...report, derivedStatus, lastRun };
    });
  }, [reports, history]);

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [validationErrors]);

  // Run report immediately
  const handleRunReport = async (report: Report) => {
    setRunningId(report.id);
    message.open({
      type: 'loading',
      content: `Running report "${report.name}"...`,
      key: 'run-report',
      duration: 0,
    });

    try {
      const record = await runReport(report.id);
      refresh();
      if (record.status === 'success') {
        message.open({
          type: 'success',
          content: `Report "${report.name}" generated and saved successfully`,
          key: 'run-report',
          duration: 3,
        });
      } else {
        message.open({
          type: 'error',
          content: `Failed to run report "${report.name}": ${record.error ?? 'Unknown error'}`,
          key: 'run-report',
          duration: 4,
        });
      }
    } catch (err) {
      message.open({
        type: 'error',
        content: apiErrorMessage(err, 'Failed to run report'),
        key: 'run-report',
        duration: 4,
      });
    } finally {
      setRunningId(null);
    }
  };

  // Open editor for creating new report
  const handleCreateNew = () => {
    setEditingReport(null);
    resetScriptGate();
    form.resetFields();
    const initialValues = {
      schedule: 'manual' as ScheduleOption,
      scheduleTime: dayjs().hour(0).minute(0),
      scheduleDayOfWeek: 1,
      scheduleDayOfMonth: 1,
      outputFormat: 'csv' as const,
      query: DEFAULT_QUERY_EXAMPLE,
    };
    form.setFieldsValue(initialValues);
    setBaselineScript(DEFAULT_QUERY_EXAMPLE);
    setBaselineFormValues({
      formValues: initialValues,
      script: DEFAULT_QUERY_EXAMPLE,
    });
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
      const formValues = {
        name: detail.name,
        description: detail.description ?? '',
        schedule: scheduleToUiValue(detail.schedule),
        scheduleTime: dayjs().hour(hour).minute(minute),
        scheduleDayOfWeek: detail.schedule?.dayOfWeek ?? 1,
        scheduleDayOfMonth: detail.schedule?.dayOfMonth ?? 1,
        outputFormat: detail.outputFormat,
        query: script,
      };
      form.setFieldsValue(formValues);
      setBaselineFormValues({ formValues, script });
      setViewMode('edit');
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to load report details'));
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleValidateScript = async () => {
    const script = form.getFieldValue('query') as string | undefined;
    if (!script?.trim()) {
      message.warning('Enter a query script before validating');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateReport(script);
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
    const script = form.getFieldValue('query') as string | undefined;
    if (!script?.trim() || !compiledScript || scriptGateStatus === 'pending') {
      message.warning('Validate the script before running a test');
      return;
    }

    testRunAbortRef.current?.abort();
    const controller = new AbortController();
    testRunAbortRef.current = controller;
    setIsTestRunning(true);
    try {
      const reportParams = editingReport?.params ?? {};
      const result = await testRunReport(script, compiledScript, reportParams, controller.signal);
      setTestRunPreview({
        recordCount: result.recordCount,
        durationMs: result.durationMs,
        sample: result.sample,
        runParams: result.runParams,
      });
      setTestRunToken(result.testRunToken);
      setScriptGateStatus('tested');
      message.success(`Test run complete — ${result.recordCount} record(s) in ${result.durationMs}ms`);
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
    () => getTestRunDateTagLabel(queryValue as string | undefined, testRunPreview?.runParams),
    [queryValue, testRunPreview?.runParams],
  );

  const performCancelEdit = useCallback(() => {
    testRunAbortRef.current?.abort();
    testRunAbortRef.current = null;
    setViewMode('list');
  }, []);

  const handleCancelEdit = useCallback(() => {
    const dirty = isEditorDirty(captureEditorSnapshot(), baselineFormValues);
    if (dirty) {
      modal.confirm({
        title: 'Discard unsaved changes?',
        content: 'You have unsaved changes that will be lost if you leave the editor.',
        okText: 'Discard',
        okType: 'danger',
        cancelText: 'Keep editing',
        onOk: performCancelEdit,
      });
      return;
    }
    performCancelEdit();
  }, [baselineFormValues, captureEditorSnapshot, modal, performCancelEdit]);

  const handleEditorTabChange = (value: EditorTab) => {
    if (editorTab === 'script' && scriptEditorScrollRef.current) {
      const textarea = scriptEditorScrollRef.current.querySelector('textarea');
      if (textarea) {
        scriptScrollTopRef.current = textarea.scrollTop;
      }
    }
    setEditorTab(value);
    if (value === 'script') {
      requestAnimationFrame(() => {
        const textarea = scriptEditorScrollRef.current?.querySelector('textarea');
        if (textarea) {
          textarea.scrollTop = scriptScrollTopRef.current;
        }
      });
    }
  };

  const handleSaveReport = async () => {
    let values: {
      name: string;
      description?: string;
      schedule: ScheduleOption;
      scheduleTime?: dayjs.Dayjs;
      scheduleDayOfWeek?: number;
      scheduleDayOfMonth?: number | 'last';
      outputFormat: 'csv' | 'excel';
      query: string;
    };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const hour = values.scheduleTime ? values.scheduleTime.hour() : 0;
    const minute = values.scheduleTime ? values.scheduleTime.minute() : 0;
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

  // Delete report
  const handleDeleteReport = (report: Report) => {
    modal.confirm({
      title: 'Confirm Delete Report',
      content: `Are you sure you want to delete report "${report.name}"? This script will be permanently deleted, but previously generated report files will remain on the server.`,
      okText: 'Delete Report',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteReport(report.id, buildEtagFromUpdDate(report.upd_date));
          message.success('Report deleted successfully');
          refresh();
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to delete report'));
        }
      },
    });
  };

  // Show generated files for specific report
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

  // Report table columns — keep cells compact (one primary line + optional ellipsis)
  const reportColumns: ColumnsType<ReportRow> = [
    {
      title: 'Report',
      key: 'name',
      ellipsis: true,
      render: (_: unknown, record: ReportRow) => (
        <div>
          <Space size={4} wrap>
            <Text strong ellipsis={{ tooltip: record.name }}>
              {record.name}
            </Text>
            {record.enabled === false && <Tag color="warning">Disabled</Tag>}
            <Tag color={validationStatusColor(record.validationStatus)}>
              {formatValidationStatusLabel(record.validationStatus)}
            </Tag>
            {record.lastTestRunMeta?.recordCount != null && (
              <Tag color="blue">Test: {record.lastTestRunMeta.recordCount}</Tag>
            )}
          </Space>
          {record.description ? (
            <Text
              type="secondary"
              ellipsis={{ tooltip: record.description }}
              style={{ fontSize: token.fontSizeSM, display: 'block', maxWidth: '100%' }}
            >
              {record.description}
            </Text>
          ) : null}
          {!screens.md ? (
            <Text
              type="secondary"
              ellipsis={{ tooltip: formatScheduleLabel(record.schedule) }}
              style={{ fontSize: token.fontSizeSM, display: 'block', maxWidth: '100%' }}
            >
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatScheduleLabel(record.schedule)}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 240,
      responsive: ['md'] as const,
      render: (_: unknown, record: ReportRow) => (
        <Space>
          <ClockCircleOutlined style={{ color: token.colorTextDescription }} />
          <span>{formatScheduleLabel(record.schedule)}</span>
        </Space>
      ),
    },
    {
      title: 'Output Format',
      dataIndex: 'outputFormat',
      key: 'outputFormat',
      width: 120,
      render: (fmt: 'csv' | 'excel') => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, record: ReportRow) => {
        if (record.derivedStatus === 'running') {
          return <Badge status="processing" text="Running" />;
        }
        if (record.derivedStatus === 'completed') {
          return <Badge status="success" text="Completed" />;
        }
        if (record.derivedStatus === 'failed') {
          return <Badge status="error" text="Failed" />;
        }
        return <Badge status="default" text="Idle" />;
      },
    },
    {
      title: 'Last Run',
      key: 'lastRun',
      width: 160,
      ellipsis: true,
      render: (_: unknown, record: ReportRow) => (
        <Text
          type="secondary"
          ellipsis={{ tooltip: record.lastRun }}
          style={{ fontSize: token.fontSizeSM }}
        >
          {record.lastRun}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: ReportRow) => (
        <Space size="small" wrap>
          <Popconfirm
            title="Run this report now?"
            description="Heavy queries may take several minutes."
            onConfirm={() => void handleRunReport(record)}
            okText="Run"
          >
            <Tooltip title="Run report">
              <Button
                type="default"
                icon={<PlayCircleOutlined />}
                aria-label="Run report"
                disabled={record.derivedStatus === 'running' || runningId === record.id}
                loading={runningId === record.id}
              />
            </Tooltip>
          </Popconfirm>
          <Tooltip title="Edit report">
            <Button
              icon={<EditOutlined />}
              aria-label="Edit report"
              onClick={() => void handleEditReport(record)}
              disabled={
                record.derivedStatus === 'running' ||
                (loadingEditId !== null && loadingEditId !== record.id)
              }
              loading={loadingEditId === record.id}
            />
          </Tooltip>
          <Tooltip title="View download history">
            <Button
              icon={<HistoryOutlined />}
              aria-label="View download history"
              onClick={() => handleViewFiles(record.id)}
            />
          </Tooltip>
          <Tooltip title="Delete report">
            <Button
              danger
              variant="outlined"
              icon={<DeleteOutlined />}
              aria-label="Delete report"
              onClick={() => handleDeleteReport(record)}
              disabled={record.derivedStatus === 'running'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Download history table columns
  const downloadColumns = [
    {
      title: 'Report Name',
      dataIndex: 'reportName',
      key: 'reportName',
      render: (name: string) => (
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Generated At',
      key: 'startedAt',
      width: 200,
      render: (_: unknown, record: DownloadHistoryRecord) => formatDateTime(record.finishedAt ?? record.startedAt),
    },
    {
      title: 'File Type',
      dataIndex: 'format',
      key: 'format',
      width: 130,
      render: (fmt: string) => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        if (status === 'success') return <Tag color="success">Success</Tag>;
        if (status === 'failed') return <Tag color="error">Failed</Tag>;
        return <Tag color="processing">Running</Tag>;
      },
    },
    {
      title: 'Download',
      key: 'download',
      width: 150,
      render: (_: unknown, record: DownloadHistoryRecord) => (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => void handleDownload(record)}
          disabled={record.status !== 'success' || !record.fileName}
        >
          Download
        </Button>
      ),
    },
  ];

  // Selected report generated downloads
  const selectedReportDownloads = history.filter((d) => d.reportId === selectedReportId);
  const selectedReportName = reports.find((r) => r.id === selectedReportId)?.name || '';

  if (viewMode === 'edit') {
    return (
      <div>
        <div
          style={{
            marginBottom: token.marginMD,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: token.marginMD,
          }}
        >
          <Breadcrumb
            items={[
              {
                title: 'Smart Report',
                onClick: handleCancelEdit,
              },
              { title: editingReport ? editingReport.name : 'New report' },
            ]}
          />
          <Space>
            <Button onClick={handleCancelEdit}>Cancel</Button>
            <Tooltip title={saveButtonTooltip}>
              <span>
                <Button
                  type="primary"
                  loading={isSaving}
                  disabled={!canSaveScript}
                  onClick={() => void handleSaveReport()}
                >
                  Save Report Script
                </Button>
              </span>
            </Tooltip>
          </Space>
        </div>

        {showGateAlert && (
          <Alert
            type="warning"
            showIcon
            message={saveGateHint}
            style={{ marginBottom: token.marginLG }}
          />
        )}

        <Steps
          size="small"
          current={scriptGateStep.current}
          style={{ marginBottom: token.marginLG }}
          items={[
            { title: 'Edit script' },
            { title: 'Validate', status: scriptGateStep.validateStatus },
            { title: 'Test run' },
            { title: 'Save' },
          ]}
        />

        <Form form={form} layout="vertical" size="middle" scrollToFirstError>
          <Row gutter={[24, 24]} align="stretch">
            {/* Left Column: Settings */}
            <Col xs={24} lg={10} order={screens.lg ? 1 : 2} style={screens.lg ? { display: 'flex' } : undefined}>
              <Card
                title={
                  <Space>
                    <FileTextOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>General Info & Scheduler</Text>
                  </Space>
                }
                variant="borderless"
                style={{
                  borderRadius: token.borderRadius,
                  width: '100%',
                  ...(screens.lg ? { flex: 1 } : {}),
                }}
              >
                <Form.Item
                  name="name"
                  label="Report Name"
                  rules={[{ required: true, message: 'Please enter report name' }]}
                >
                  <Input placeholder="e.g. Active Staff Login Analytics Report" />
                </Form.Item>

                <Form.Item name="description" label="Description">
                  <Input placeholder="Specify report purpose and data schema" />
                </Form.Item>

                <Form.Item
                  name="outputFormat"
                  label="Output Format"
                  rules={[{ required: true }]}
                >
                  <Segmented
                    block
                    options={[
                      { label: 'CSV (.csv)', value: 'csv' },
                      { label: 'Excel (.xlsx)', value: 'excel' },
                    ]}
                  />
                </Form.Item>

                <div style={{ marginTop: token.marginSM }}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Form.Item
                        name="schedule"
                        label="Schedule Frequency"
                        rules={[{ required: true }]}
                      >
                        <Select>
                          <Select.Option value="manual">Manual</Select.Option>
                          <Select.Option value="daily">Daily</Select.Option>
                          <Select.Option value="weekly">Weekly</Select.Option>
                          <Select.Option value="monthly">Monthly</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>

                    {scheduleValue && scheduleValue !== 'manual' && (
                      <>
                        {scheduleValue === 'weekly' && (
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="scheduleDayOfWeek"
                              label="Run Day"
                              rules={[{ required: true }]}
                            >
                              <Select style={{ width: '100%' }}>
                                <Select.Option value={1}>Monday</Select.Option>
                                <Select.Option value={2}>Tuesday</Select.Option>
                                <Select.Option value={3}>Wednesday</Select.Option>
                                <Select.Option value={4}>Thursday</Select.Option>
                                <Select.Option value={5}>Friday</Select.Option>
                                <Select.Option value={6}>Saturday</Select.Option>
                                <Select.Option value={0}>Sunday</Select.Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        )}

                        {scheduleValue === 'monthly' && (
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="scheduleDayOfMonth"
                              label="Run Day"
                              rules={[{ required: true }]}
                            >
                              <Select style={{ width: '100%' }}>
                                <Select.Option value="last">Last day of month</Select.Option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                  <Select.Option key={day} value={day}>
                                    Day {day}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        )}

                        <Col xs={24} sm={scheduleValue === 'daily' ? 24 : 12}>
                          <Form.Item
                            name="scheduleTime"
                            label="Run Time"
                            rules={[{ required: true, message: 'Please select run time' }]}
                          >
                            <TimePicker format="HH:mm" style={{ width: '100%' }} needConfirm={false} />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                  </Row>
                </div>
              </Card>
            </Col>

            {/* Right Column: Query Editor */}
            <Col xs={24} lg={14} order={screens.lg ? 2 : 1} style={screens.lg ? { display: 'flex' } : undefined}>
              <Card
                title={
                  <Space>
                    <CodeOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Query Script</Text>
                  </Space>
                }
                variant="borderless"
                style={{
                  borderRadius: token.borderRadius,
                  width: '100%',
                  ...(screens.lg ? { flex: 1 } : {}),
                }}
              >
                <div
                  style={{
                    background: token.colorBgLayout,
                    padding: '8px 16px',
                    borderTopLeftRadius: token.borderRadius,
                    borderTopRightRadius: token.borderRadius,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: `1px solid ${token.colorBorder}`,
                    borderBottom: 'none',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Space wrap>
                    <Segmented
                      size="small"
                      value={editorTab}
                      onChange={(value) => handleEditorTabChange(value as EditorTab)}
                      options={[
                        { label: 'Script', value: 'script' },
                        {
                          label: 'Compiled',
                          value: 'compiled',
                          disabled: !compiledScript,
                        },
                      ]}
                    />
                  </Space>
                  <Space wrap>
                    <Popconfirm
                      title="Reset to example template?"
                      description="Your current script will be replaced with the default example."
                      onConfirm={handleResetToExample}
                      okText="Reset"
                      okType="danger"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<SyncOutlined />}
                      >
                        Reset to Example
                      </Button>
                    </Popconfirm>
                    <Button
                      size="small"
                      icon={<CheckCircleOutlined />}
                      loading={isValidating}
                      onClick={() => void handleValidateScript()}
                    >
                      Validate
                    </Button>
                    <Button
                      size="small"
                      icon={<ExperimentOutlined />}
                      loading={isTestRunning}
                      disabled={scriptGateStatus === 'pending' || !compiledScript || isTestRunning}
                      onClick={() => void handleTestRunScript()}
                    >
                      Test Run
                    </Button>
                    {isTestRunning && (
                      <Button
                        size="small"
                        danger
                        icon={<StopOutlined />}
                        onClick={handleCancelTestRun}
                      >
                        Cancel
                      </Button>
                    )}
                  </Space>
                </div>

                {editorTab === 'script' ? (
                  <div ref={scriptEditorScrollRef}>
                    <Form.Item
                      name="query"
                      rules={[{ required: true, message: 'Please enter query script' }]}
                      style={{ marginBottom: 16 }}
                    >
                      <TextArea
                        autoSize={{ minRows: 10, maxRows: 18 }}
                        onChange={(e) => handleQueryScriptChange(e.target.value)}
                        style={{
                          fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                          fontSize: token.fontSizeSM,
                          background: token.colorBgContainer,
                          color: token.colorText,
                          border: `1px solid ${token.colorBorder}`,
                          borderTopLeftRadius: 0,
                          borderTopRightRadius: 0,
                          borderBottomLeftRadius: token.borderRadius,
                          borderBottomRightRadius: token.borderRadius,
                          padding: '16px',
                          lineHeight: '1.6',
                        }}
                        placeholder="// Query example..."
                      />
                    </Form.Item>
                  </div>
                ) : (
                  <TextArea
                    readOnly
                    value={compiledScript ?? ''}
                    autoSize={{ minRows: 10, maxRows: 18 }}
                    style={{
                      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                      fontSize: token.fontSizeSM,
                      background: token.colorBgContainer,
                      color: token.colorText,
                      border: `1px solid ${token.colorBorder}`,
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      borderBottomLeftRadius: token.borderRadius,
                      borderBottomRightRadius: token.borderRadius,
                      padding: '16px',
                      lineHeight: '1.6',
                      marginBottom: 16,
                    }}
                  />
                )}

                {validationErrors.length > 0 && (
                  <div ref={validationAlertRef}>
                    <Alert
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message="Validation errors"
                      description={
                        <List
                          size="small"
                          dataSource={validationErrors}
                          renderItem={(err) => (
                            <List.Item style={{ padding: '4px 0' }}>
                              <Text code={err.line != null}>
                                {err.line != null ? `Line ${err.line}: ` : ''}
                                {err.message}
                              </Text>
                            </List.Item>
                          )}
                        />
                      }
                    />
                  </div>
                )}

                <Collapse
                  size="small"
                  items={[
                    {
                      key: 'workflow',
                      label: 'Script workflow',
                      children: (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>Validate compiles without querying the database.</li>
                          <li>Test run uses yesterday&apos;s params.startDate / params.endDate when referenced.</li>
                          <li>Save unlocks after a successful test run when the script changed.</li>
                        </ul>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>

            {testRunPreview && (
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <ExperimentOutlined style={{ color: token.colorPrimary }} />
                      <Text strong>Test run preview</Text>
                    </Space>
                  }
                  variant="borderless"
                  style={{ borderRadius: token.borderRadius }}
                >
                  {scriptGateStatus === 'tested' && (
                    <Alert
                      type="success"
                      showIcon
                      message="Test run succeeded"
                      style={{ marginBottom: token.marginSM }}
                    />
                  )}
                  <Descriptions
                    size="small"
                    bordered
                    column={{ xs: 1, sm: 2, lg: 3 }}
                    style={{ marginBottom: token.marginMD }}
                  >
                    {testRunDateTagLabel && (
                      <Descriptions.Item label="Date range">{testRunDateTagLabel}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Records">
                      {formatTestRunPreviewCount(
                        testRunPreview.recordCount,
                        testRunPreview.sample.length,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Duration">
                      {testRunPreview.durationMs}ms
                    </Descriptions.Item>
                  </Descriptions>
                  {testRunPreviewTable.rows.length > 0 ? (
                    <Table
                      size="small"
                      dataSource={testRunPreviewTable.rows}
                      columns={testRunPreviewTable.columns}
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                    />
                  ) : testRunPreview.recordCount > 0 ? (
                    <Text type="secondary">
                      {testRunPreview.recordCount} record(s) returned — preview rows could not be displayed.
                    </Text>
                  ) : (
                    <Empty
                      description={
                        testRunDateTagLabel
                          ? `Query returned no rows for ${testRunDateTagLabel}`
                          : 'Query returned no rows'
                      }
                    />
                  )}
                </Card>
              </Col>
            )}
          </Row>
        </Form>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: token.marginLG, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Smart Report</Title>
          <Text type="secondary">
            Automated reporting and scheduling system. Fetches data directly via a read-only database replica.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreateNew}
        >
          Create New Report
        </Button>
      </div>

      {/* Database Warning Banner */}
      <Card
        style={{
          marginBottom: token.marginLG,
          background: token.colorInfoBg,
          border: `1px solid ${token.colorInfoBorder}`,
        }}
        variant="borderless"
      >
        <Space align="start">
          <CodeOutlined style={{ color: token.colorInfo, fontSize: 24, marginTop: 4 }} />
          <div>
            <Text strong style={{ color: token.colorInfoText }}>Secure Read-Only Access</Text>
            <Paragraph style={{ margin: 0, color: token.colorInfoText, fontSize: token.fontSizeSM }}>
              All reports run on secondary database replicas in read-only mode. Heavy queries or aggregation pipelines can be executed safely without affecting the main transactional server performance.
            </Paragraph>
          </div>
        </Space>
      </Card>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'reports',
            label: (
              <span>
                <CodeOutlined /> Report Scripts
              </span>
            ),
            children: (
              <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
                <Table
                  dataSource={reportRows}
                  columns={reportColumns}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Download History
              </span>
            ),
            children: (
              <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
                <Table
                  dataSource={history}
                  columns={downloadColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content' }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Drawer: Download history of specific report */}
      <Drawer
        title={`Download History: ${selectedReportName}`}
        placement="right"
        width={screens.md ? 650 : '100%'}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedReportDownloads.length > 0 ? (
          <Table
            dataSource={selectedReportDownloads}
            columns={[
              {
                title: 'Run Date',
                key: 'startedAt',
                render: (_, rec) => formatDateTime(rec.finishedAt ?? rec.startedAt),
              },
              {
                title: 'File Type',
                dataIndex: 'format',
                key: 'format',
                render: (fmt) => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status) => {
                  if (status === 'success') return <Tag color="success">Success</Tag>;
                  if (status === 'failed') return <Tag color="error">Failed</Tag>;
                  return <Tag color="processing">Running</Tag>;
                },
              },
              {
                title: 'Download',
                key: 'dl',
                render: (_, rec) => (
                  <Button
                    type="primary"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => void handleDownload(rec)}
                    disabled={rec.status !== 'success' || !rec.fileName}
                  >
                    Download
                  </Button>
                ),
              },
            ]}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        ) : (
          <Empty description="No execution history or saved files for this script." />
        )}
      </Drawer>
    </div>
  );
};

export default SmartReport;
