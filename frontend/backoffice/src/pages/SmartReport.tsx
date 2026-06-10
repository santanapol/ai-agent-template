import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  Tooltip,
  Badge,
  theme,
  Drawer,
  Empty,
} from 'antd';
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

const DEFAULT_QUERY_EXAMPLE = `// --- 0. กำหนดค่าการค้นหา (Constants & Placeholders) ---
const ou_id = ObjectId("5f4f9d57266ed249e45ecef5");
const branch_id = ObjectId("5f4fb5bb3156af7a2db9e5a0");
const timezone = "+07:00";

const startDate = ISODate("{{startDate}}");
const endDate = ISODate("{{endDate}}");

// --- 1. เตรียม Database Connection ---
const mainDB = db.getSiblingDB("gpp_777ww");

// --- 2. ดึงข้อมูลและประมวลผล (Execution) ---
mainDB.su_staff_login_log.aggregate([
    { $match: { ou_id, branch_id, date: { $gte: startDate, $lte: endDate } } },
    { $sort: { date: -1 } },
    {
        $project: {
            date: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$date", timezone } },
            username: "$username",
            ip_address: "$ip_address",
            status: "$status"
        }
    }
]);`;

const SCHEDULE_LABELS: Record<ScheduleOption, string> = {
  manual: 'Manual (ไม่ตั้งเวลา)',
  daily: 'Daily (ทุกวัน)',
  weekly: 'Weekly (ทุกวันจันทร์)',
  monthly: 'Monthly (ทุกสิ้นเดือน)',
};

// แปลงตัวเลือก schedule บนหน้าจอเป็นโครงสร้างที่ backend ต้องการ (ค่าเริ่มต้นต่อรอบเวลา)
function scheduleFromUiValue(value: ScheduleOption): ReportSchedule | null {
  switch (value) {
    case 'daily':
      return { frequency: 'daily', hour: 0, minute: 0, timezone: 'UTC' };
    case 'weekly':
      return { frequency: 'weekly', dayOfWeek: 1, hour: 0, minute: 0, timezone: 'UTC' };
    case 'monthly':
      return { frequency: 'monthly', dayOfMonth: 28, hour: 23, minute: 59, timezone: 'UTC' };
    default:
      return null;
  }
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
  return new Date(iso).toISOString().replace('T', ' ').substring(0, 19);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm();

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  // Load reports + download history together
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [reportsData, historyData] = await Promise.all([listReports(), listHistory()]);
        if (cancelled) return;
        setReports(reportsData);
        setHistory(historyData);
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'ไม่สามารถโหลดข้อมูลรายงานได้'));
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
      content: `กำลังสั่งรันรายงาน "${report.name}"...`,
      key: 'run-report',
      duration: 0,
    });

    try {
      const record = await runReport(report.id);
      refresh();
      if (record.status === 'success') {
        message.open({
          type: 'success',
          content: `สร้างรายงาน "${report.name}" สำเร็จและบันทึกไฟล์เรียบร้อยแล้ว`,
          key: 'run-report',
          duration: 3,
        });
      } else {
        message.open({
          type: 'error',
          content: `รันรายงาน "${report.name}" ไม่สำเร็จ: ${record.error ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`,
          key: 'run-report',
          duration: 4,
        });
      }
    } catch (err) {
      message.open({
        type: 'error',
        content: apiErrorMessage(err, 'ไม่สามารถสั่งรันรายงานได้'),
        key: 'run-report',
        duration: 4,
      });
    } finally {
      setRunningId(null);
    }
  };

  // Open modal for creating new report
  const handleCreateNew = () => {
    setEditingReport(null);
    form.resetFields();
    form.setFieldsValue({
      schedule: 'manual',
      outputFormat: 'csv',
      query: DEFAULT_QUERY_EXAMPLE,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing report
  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    form.setFieldsValue({
      name: report.name,
      description: report.description ?? '',
      schedule: scheduleToUiValue(report.schedule),
      outputFormat: report.outputFormat,
      query: report.script,
    });
    setIsModalOpen(true);
  };

  // Save report (create or edit)
  const handleSaveReport = async () => {
    let values: { name: string; description: string; schedule: ScheduleOption; outputFormat: 'csv' | 'excel'; query: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload: ReportPayload = {
      name: values.name,
      description: values.description,
      script: values.query,
      outputFormat: values.outputFormat,
      schedule: scheduleFromUiValue(values.schedule),
    };

    setIsSaving(true);
    try {
      if (editingReport) {
        await updateReport(editingReport.id, payload, buildEtagFromUpdDate(editingReport.upd_date));
        message.success('แก้ไขรายงานเรียบร้อยแล้วค่ะ');
      } else {
        await createReport(payload as CreateReportPayload);
        message.success('สร้างรายงานใหม่เรียบร้อยแล้วค่ะ');
      }
      setIsModalOpen(false);
      refresh();
    } catch (err) {
      message.error(
        apiErrorMessage(err, editingReport ? 'ไม่สามารถแก้ไขรายงานได้' : 'ไม่สามารถสร้างรายงานได้'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Delete report
  const handleDeleteReport = (report: Report) => {
    modal.confirm({
      title: 'ยืนยันการลบรายงาน',
      content: `คุณแน่ใจหรือไม่ที่จะลบรายงาน "${report.name}"? สคริปต์นี้จะถูกลบออกจากระบบอย่างถาวร แต่ไฟล์รายงานเก่าที่รันเสร็จแล้วจะยังคงอยู่บนเซิร์ฟเวอร์`,
      okText: 'ลบรายงาน',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await deleteReport(report.id, buildEtagFromUpdDate(report.upd_date));
          message.success('ลบรายงานเรียบร้อยแล้วค่ะ');
          refresh();
        } catch (err) {
          message.error(apiErrorMessage(err, 'ไม่สามารถลบรายงานได้'));
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
      message.error(apiErrorMessage(err, 'ไม่สามารถดาวน์โหลดไฟล์ได้'));
    }
  };

  // Report table columns
  const reportColumns = [
    {
      title: 'ชื่อรายงาน / คำอธิบาย',
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
      title: 'รอบเวลารัน (Schedule)',
      key: 'schedule',
      width: 180,
      render: (_: unknown, record: ReportRow) => (
        <Space>
          <ClockCircleOutlined style={{ color: token.colorTextDescription }} />
          <span>{SCHEDULE_LABELS[scheduleToUiValue(record.schedule)]}</span>
        </Space>
      ),
    },
    {
      title: 'รูปแบบไฟล์',
      dataIndex: 'outputFormat',
      key: 'outputFormat',
      width: 120,
      render: (fmt: 'csv' | 'excel') => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
    },
    {
      title: 'การเชื่อมต่อ Database',
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
      title: 'สถานะ / การรันล่าสุด',
      key: 'status',
      width: 200,
      render: (_: unknown, record: ReportRow) => {
        if (record.derivedStatus === 'running') {
          return (
            <Space direction="vertical" size={2}>
              <Badge status="processing" text="Running..." />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                <SyncOutlined spin /> กำลังประมวลผล
              </Text>
            </Space>
          );
        }
        if (record.derivedStatus === 'completed') {
          return (
            <Space direction="vertical" size={2}>
              <Badge status="success" text="Completed" />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                รันเมื่อ: {record.lastRun}
              </Text>
            </Space>
          );
        }
        if (record.derivedStatus === 'failed') {
          return (
            <Space direction="vertical" size={2}>
              <Badge status="error" text="Failed" />
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                รันเมื่อ: {record.lastRun}
              </Text>
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={2}>
            <Badge status="default" text="Idle" />
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              ยังไม่เคยรัน
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'เครื่องมือจัดการ',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: ReportRow) => (
        <Space size="middle">
          <Tooltip title="สั่งรัน Query เพื่อส่งออกไฟล์ทันที">
            <Button
              type="primary"
              variant="dashed"
              color="default"
              icon={<PlayCircleOutlined />}
              onClick={() => void handleRunReport(record)}
              disabled={record.derivedStatus === 'running' || runningId === record.id}
            />
          </Tooltip>
          <Tooltip title="แก้ไข Query / รอบเวลา">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditReport(record)}
              disabled={record.derivedStatus === 'running'}
            />
          </Tooltip>
          <Tooltip title="ดูประวัติไฟล์ดาวน์โหลด">
            <Button icon={<HistoryOutlined />} onClick={() => handleViewFiles(record.id)}>
              ไฟล์ดาวน์โหลด
            </Button>
          </Tooltip>
          <Tooltip title="ลบรายการนี้">
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
      title: 'ชื่อรายงาน',
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
      title: 'วันเวลาที่บันทึก',
      key: 'startedAt',
      width: 200,
      render: (_: unknown, record: DownloadHistoryRecord) => formatDateTime(record.finishedAt ?? record.startedAt),
    },
    {
      title: 'ประเภทไฟล์',
      dataIndex: 'format',
      key: 'format',
      width: 130,
      render: (fmt: string) => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
    },
    {
      title: 'สถานะ',
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
      title: 'ดาวน์โหลด',
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: token.marginLG, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Smart Report</Title>
          <Text type="secondary">
            ระบบจัดทำและตั้งเวลารันรายงานอัตโนมัติ สำหรับดึงข้อมูลรายงานโดยตรงผ่าน Database แบบ Read-only เสมอ
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreateNew}
        >
          สร้างสคริปต์รายงานใหม่
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
            <Text strong style={{ color: token.colorInfoText }}>ระบบดึงข้อมูลแบบแยกส่วนปลอดภัย</Text>
            <Paragraph style={{ margin: 0, color: token.colorInfoText, fontSize: token.fontSizeSM }}>
              การประมวลผลรายงานทั้งหมดใช้ Connection สำหรับอ่านข้อมูลฝั่ง Secondary Node และ Read-only เท่านั้น
              สามารถใส่ Query สำหรับการวิเคราะห์ขนาดใหญ่หรือ Aggregate pipeline ได้โดยไม่กระทบต่อประสิทธิภาพการทำงานของเซิร์ฟเวอร์หลัก
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
                <CodeOutlined /> รายชื่อสคริปต์รายงาน
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
                <HistoryOutlined /> ประวัติไฟล์ดาวน์โหลดทั้งหมด
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

      {/* Create / Edit Modal Dialog */}
      <Modal
        title={editingReport ? 'แก้ไขสคริปต์รายงาน' : 'เพิ่มสคริปต์รายงานใหม่'}
        open={isModalOpen}
        onOk={() => void handleSaveReport()}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isSaving}
        width={850}
        okText={editingReport ? 'บันทึกการแก้ไข' : 'สร้างรายงาน'}
        cancelText="ยกเลิก"
      >
        <Form form={form} layout="vertical" style={{ marginTop: token.marginLG }}>
          <Form.Item
            name="name"
            label="ชื่อรายงาน"
            rules={[{ required: true, message: 'กรุณากรอกชื่อรายงาน' }]}
          >
            <Input placeholder="เช่น รายงานวิเคราะห์รายชื่อ Staff login" />
          </Form.Item>

          <Form.Item
            name="description"
            label="คำอธิบายรายงาน"
            rules={[{ required: true, message: 'กรุณากรอกคำอธิบาย' }]}
          >
            <Input placeholder="ระบุการทำงานและข้อมูลที่ดึงได้จากรายงานนี้" />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              name="schedule"
              label="รอบเวลาประมวลผล (Scheduler)"
              rules={[{ required: true }]}
              style={{ minWidth: 320 }}
            >
              <Select>
                <Select.Option value="manual">Manual (ไม่ตั้งเวลา - รันด้วยมือเท่านั้น)</Select.Option>
                <Select.Option value="daily">Daily (รันอัตโนมัติทุกวัน เวลา 00:00 น.)</Select.Option>
                <Select.Option value="weekly">Weekly (รันอัตโนมัติทุกวันจันทร์ เวลา 00:00 น.)</Select.Option>
                <Select.Option value="monthly">Monthly (รันอัตโนมัติทุกวันสิ้นเดือน เวลา 23:59 น.)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="outputFormat"
              label="รูปแบบไฟล์ผลลัพธ์ (Output Format)"
              rules={[{ required: true, message: 'กรุณาเลือกรูปแบบไฟล์ผลลัพธ์' }]}
              style={{ minWidth: 200 }}
            >
              <Select>
                <Select.Option value="csv">CSV (.csv)</Select.Option>
                <Select.Option value="excel">Excel (.xlsx)</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            name="query"
            label={
              <Space>
                <span>MongoDB Shell Query Script</span>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  (ใช้ระบบ Template replace แทนค่าตัวแปรด้วย <code>{"{{startDate}}"}</code> และ <code>{"{{endDate}}"}</code>)
                </Text>
              </Space>
            }
            rules={[{ required: true, message: 'กรุณาใส่ Query Script' }]}
          >
            <TextArea
              rows={12}
              style={{
                fontFamily: 'monospace',
                fontSize: token.fontSizeSM,
                background: '#fafafa',
              }}
              placeholder="// ตัวอย่างคำสั่งดึงข้อมูล..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer: Download history of specific report */}
      <Drawer
        title={`ไฟล์ดาวน์โหลดทั้งหมด: ${selectedReportName}`}
        placement="right"
        width={650}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        {selectedReportDownloads.length > 0 ? (
          <Table
            dataSource={selectedReportDownloads}
            columns={[
              {
                title: 'วันที่รันรายงาน',
                key: 'startedAt',
                render: (_, rec) => formatDateTime(rec.finishedAt ?? rec.startedAt),
              },
              {
                title: 'ชนิดไฟล์',
                dataIndex: 'format',
                key: 'format',
                render: (fmt) => <Tag color={fmt === 'csv' ? 'gold' : 'green'}>{fmt.toUpperCase()}</Tag>,
              },
              {
                title: 'สถานะ',
                dataIndex: 'status',
                key: 'status',
                render: (status) => {
                  if (status === 'success') return <Tag color="success">Success</Tag>;
                  if (status === 'failed') return <Tag color="error">Failed</Tag>;
                  return <Tag color="processing">Running</Tag>;
                },
              },
              {
                title: 'ดาวน์โหลด',
                key: 'dl',
                render: (_, rec) => (
                  <Button
                    type="primary"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => void handleDownload(rec)}
                    disabled={rec.status !== 'success' || !rec.fileName}
                  >
                    โหลด
                  </Button>
                ),
              },
            ]}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        ) : (
          <Empty description="ยังไม่มีการรันและบันทึกไฟล์สคริปต์นี้ในอดีต" />
        )}
      </Drawer>
    </div>
  );
};

export default SmartReport;
