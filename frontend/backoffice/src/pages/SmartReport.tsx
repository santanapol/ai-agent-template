import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Divider,
  TimePicker,
  Row,
  Col,
} from 'antd';
import dayjs from 'dayjs';
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
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAppFeedback } from '../hooks/useAppFeedback';
import { apiErrorMessage } from '../lib/apiError';
import {
  listReports,
  createReport,
  updateReport,
  deleteReport,
  runReport,
  listHistory,
  downloadReportFile,
  buildEtagFromUpdDate,
} from '../lib/smartReportApiClient';
import type {
  Report,
  ReportSchedule,
  DownloadHistoryRecord,
  ReportPayload,
  CreateReportPayload,
} from '../types/smartReport';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ScheduleOption = 'manual' | 'daily' | 'weekly' | 'monthly';
type ReportStatus = 'completed' | 'running' | 'failed' | 'idle';

interface ReportRow extends Report {
  derivedStatus: ReportStatus;
  lastRun: string;
}

const DEFAULT_QUERY_EXAMPLE = `// --- 0. Define Time Range (Dynamic Parameters) ---
const startDate = ISODate(params.startDate);
const endDate = ISODate(params.endDate);

// --- 1. Connect to Target Database ---
const targetDB = db.getSiblingDB("your_database_name");

// --- 2. Write Aggregate Query to Fetch Report Data ---
targetDB.your_collection_name.aggregate([
    {
        $match: {
            // Filter data by date range
            created_at: { $gte: startDate, $lte: endDate }
        }
    },
    {
        $project: {
            _id: 0, // 0 = hide this column, 1 = show this column
            column_name_1: "$field_name_1",
            column_name_2: "$field_name_2",
            created_at: 1
        }
    }
]);`;


function formatScheduleLabel(schedule: ReportSchedule | null): string {
  if (!schedule) return 'Manual (No schedule)';
  const hourStr = String(schedule.hour ?? 0).padStart(2, '0');
  const minStr = String(schedule.minute ?? 0).padStart(2, '0');
  const timeStr = `${hourStr}:${minStr}`;

  if (schedule.frequency === 'daily') {
    return `Daily (Every day at ${timeStr})`;
  }
  if (schedule.frequency === 'weekly') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[schedule.dayOfWeek ?? 1];
    return `Weekly (Every ${dayName} at ${timeStr})`;
  }
  if (schedule.frequency === 'monthly') {
    if (schedule.dayOfMonth === 'last') {
      return `Monthly (Last day of the month at ${timeStr})`;
    }
    return `Monthly (Day ${schedule.dayOfMonth ?? 1} of the month at ${timeStr})`;
  }
  return 'Manual (No schedule)';
}

function scheduleToUiValue(schedule: ReportSchedule | null): ScheduleOption {
  if (!schedule) return 'manual';
  if (schedule.frequency === 'daily' || schedule.frequency === 'weekly' || schedule.frequency === 'monthly') {
    return schedule.frequency;
  }
  return 'manual';
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  if (!d.isValid()) return '—';
  return d.format('YYYY-MM-DD HH:mm:ss');
}

const SmartReport: React.FC = () => {
  const { token } = theme.useToken();
  const { message, modal } = useAppFeedback();
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
  const [form] = Form.useForm();
  const scheduleValue = Form.useWatch('schedule', form);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  // Load reports + download history together
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [reportsRes, historyRes] = await Promise.all([
          listReports({ limit: 100 }),
          listHistory({ limit: 100 }),
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

  // Run report immediately and persist the resulting CSV/Excel file on the server
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
    form.resetFields();
    form.setFieldsValue({
      schedule: 'manual',
      scheduleTime: dayjs().hour(0).minute(0),
      scheduleDayOfWeek: 1,
      scheduleDayOfMonth: 1,
      outputFormat: 'csv',
      query: DEFAULT_QUERY_EXAMPLE,
    });
    setViewMode('edit');
  };

  // Open editor for editing report
  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    const hour = report.schedule?.hour ?? 0;
    const minute = report.schedule?.minute ?? 0;
    form.setFieldsValue({
      name: report.name,
      description: report.description ?? '',
      schedule: scheduleToUiValue(report.schedule),
      scheduleTime: dayjs().hour(hour).minute(minute),
      scheduleDayOfWeek: report.schedule?.dayOfWeek ?? 1,
      scheduleDayOfMonth: report.schedule?.dayOfMonth ?? 1,
      outputFormat: report.outputFormat,
      query: report.script,
    });
    setViewMode('edit');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setViewMode('list');
  };

  // Save report (create or edit)
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
      script: values.query,
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

  // Report table columns
  const reportColumns = [
    {
      title: 'Report Name / Description',
      key: 'name',
      render: (_: unknown, record: ReportRow) => (
        <div>
          <Text strong style={{ fontSize: token.fontSizeLG }}>
            {record.name}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">{record.description}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 240,
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
      title: 'Database Connection',
      key: 'db',
      width: 180,
      render: () => (
        <Space>
          <Tag color="cyan">Secondary</Tag>
          <Tag color="blue">Read-only</Tag>
        </Space>
      ),
    },
    {
      title: 'Status / Last Run',
      key: 'status',
      width: 200,
      render: (_: unknown, record: ReportRow) => {
        if (record.derivedStatus === 'running') {
          return (
            <Space orientation="vertical" size={2}>
              <Badge status="processing" text="Running..." />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                <SyncOutlined spin /> Processing
              </Text>
            </Space>
          );
        }
        if (record.derivedStatus === 'completed') {
          return (
            <Space orientation="vertical" size={2}>
              <Badge status="success" text="Completed" />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Last Run: {record.lastRun}
              </Text>
            </Space>
          );
        }
        if (record.derivedStatus === 'failed') {
          return (
            <Space orientation="vertical" size={2}>
              <Badge status="error" text="Failed" />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Last Run: {record.lastRun}
              </Text>
            </Space>
          );
        }
        return (
          <Space orientation="vertical" size={2}>
            <Badge status="default" text="Idle" />
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              Never run
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: ReportRow) => (
        <Space size="middle">
          <Tooltip title="Run query and export file immediately">
            <Button
              type="primary"
              variant="dashed"
              color="default"
              icon={<PlayCircleOutlined />}
              onClick={() => void handleRunReport(record)}
              disabled={record.derivedStatus === 'running' || runningId === record.id}
            />
          </Tooltip>
          <Tooltip title="Edit query / schedule">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditReport(record)}
              disabled={record.derivedStatus === 'running'}
            />
          </Tooltip>
          <Tooltip title="View download history">
            <Button icon={<HistoryOutlined />} onClick={() => handleViewFiles(record.id)}>
              Downloads
            </Button>
          </Tooltip>
          <Tooltip title="Delete this report">
            <Button
              type="primary"
              danger
              variant="solid"
              icon={<DeleteOutlined />}
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
        {/* Editor Page Header */}
        <div style={{ marginBottom: token.marginLG, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleCancelEdit}
              size="large"
            />
            <div>
              <Title level={2} style={{ margin: 0 }}>
                {editingReport ? 'Edit Report Script' : 'Create New Report Script'}
              </Title>
              <Text type="secondary">
                {editingReport ? `Editing: ${editingReport.name}` : 'Specify data query script and processing schedule'}
              </Text>
            </div>
          </Space>
          <Space>
            <Button size="large" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              loading={isSaving}
              onClick={() => void handleSaveReport()}
            >
              Save Report Script
            </Button>
          </Space>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={[24, 24]}>
            {/* Left Column: Settings */}
            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space>
                    <FileTextOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>General Info & Scheduler</Text>
                  </Space>
                }
                variant="borderless"
                style={{ borderRadius: token.borderRadius }}
              >
                {/* Name & Description */}
                <Form.Item
                  name="name"
                  label={<Text strong>Report Name</Text>}
                  rules={[{ required: true, message: 'Please enter report name' }]}
                >
                  <Input placeholder="e.g. Active Staff Login Analytics Report" size="large" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={<Text strong>Description</Text>}
                >
                  <Input placeholder="Specify report purpose and data schema" size="large" />
                </Form.Item>

                <Divider titlePlacement="left" style={{ margin: '24px 0 16px 0' }}>
                  <Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>Output Format</Text>
                </Divider>

                <Form.Item
                  name="outputFormat"
                  label={<Text strong>Output Format</Text>}
                  rules={[{ required: true }]}
                >
                  <Segmented
                    size="large"
                    block
                    options={[
                      { label: 'CSV (.csv)', value: 'csv' },
                      { label: 'Excel (.xlsx)', value: 'excel' },
                    ]}
                  />
                </Form.Item>

                <Divider titlePlacement="left" style={{ margin: '24px 0 16px 0' }}>
                  <Text type="secondary" strong style={{ fontSize: token.fontSizeSM }}>Auto Scheduler</Text>
                </Divider>

                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Form.Item
                      name="schedule"
                      label={<Text strong>Schedule Frequency</Text>}
                      rules={[{ required: true }]}
                    >
                      <Select size="large">
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
                            label={<Text strong>Run Day</Text>}
                            rules={[{ required: true }]}
                          >
                            <Select size="large" style={{ width: '100%' }}>
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
                            label={<Text strong>Run Day</Text>}
                            rules={[{ required: true }]}
                          >
                            <Select size="large" style={{ width: '100%' }}>
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
                          label={<Text strong>Run Time</Text>}
                          rules={[{ required: true, message: 'Please select run time' }]}
                        >
                          <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} needConfirm={false} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                </Row>
              </Card>
            </Col>

            {/* Right Column: Query Editor */}
            <Col xs={24} lg={14}>
              <Card
                title={
                  <Space>
                    <CodeOutlined style={{ color: token.colorPrimary }} />
                    <Text strong>Query Script</Text>
                  </Space>
                }
                variant="borderless"
                style={{ borderRadius: token.borderRadius }}
              >
                {/* IDE Header Bar */}
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
                  }}
                >
                  <Space>
                    <Badge status="processing" color={token.colorSuccess} />
                    <Text style={{ color: token.colorTextDescription, fontFamily: 'monospace', fontSize: token.fontSizeSM }}>
                      query.js (MongoDB Read-Only Connection)
                    </Text>
                  </Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      const currentQuery = form.getFieldValue('query');
                      if (!currentQuery || currentQuery === DEFAULT_QUERY_EXAMPLE) {
                        form.setFieldsValue({ query: DEFAULT_QUERY_EXAMPLE });
                        message.info('Default template loaded successfully');
                      }
                    }}
                  >
                    Reset to Example
                  </Button>
                </div>

                <Form.Item
                  name="query"
                  rules={[{ required: true, message: 'Please enter query script' }]}
                  style={{ marginBottom: 16 }}
                >
                  <TextArea
                    rows={22}
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

                <div style={{ padding: '8px', background: token.colorInfoBg, borderRadius: token.borderRadius, border: `1px solid ${token.colorInfoBorder}` }}>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    💡 You can access the dynamic start and end dates as ISO strings using variables params.startDate and params.endDate directly in your JavaScript query script.
                  </Text>
                </div>
              </Card>
            </Col>
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
                  pagination={{ pageSize: 10 }}
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
        size={650}
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
