import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Typography,
  Modal,
  Form,
} from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import dayjs, { type Dayjs } from 'dayjs';
import { useInvoices } from './hooks/useInvoices';
import { formatDate, formatMoney, statusTagColor } from './utils';
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from '../../types/invoice';
import { useAppFeedback } from '../../hooks/useAppFeedback';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import { canSwitchActiveBranch } from '../../lib/branchOptions';
import { BulkInvoiceActionBar } from './components/BulkInvoiceActionBar';
import { BulkExportModal } from './components/BulkExportModal';
import { BulkStatusModal } from './components/BulkStatusModal';
import { MAX_BULK_INVOICE_SELECTION } from './bulk/constants';
import { PageContainer, PageContentCard, FiltersContainer } from '../../components/layout';
import type { BulkExportFormat } from './export/types';
import type { BulkStatusAction } from './status/types';

const { Title } = Typography;

interface ExportJobState {
  ids: string[];
  format: BulkExportFormat;
}

interface StatusJobState {
  ids: string[];
  action: BulkStatusAction;
}

const InvoiceList: React.FC = () => {
  const { message } = useAppFeedback();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canExport = usePermission('invoices:read');
  const canWrite = usePermission('invoices:write');
  const {
    invoices,
    total,
    loading,
    generating,
    branches,
    loadingBranches,
    fetchInvoices,
    fetchInvoiceAgents,
    generateInvoices,
  } = useInvoices();

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchText, setSearchText] = useState(searchParams.get('search') ?? '');
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    searchParams.get('branch_id') ?? undefined,
  );
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>(
    (searchParams.get('status') as InvoiceStatus | null) ?? undefined,
  );
  const [billingMonth, setBillingMonth] = useState<string | undefined>(
    searchParams.get('billing_month') ?? undefined,
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 10);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm<{ month: Dayjs; branch_id?: string }>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exportJob, setExportJob] = useState<ExportJobState | null>(null);
  const [exportRunning, setExportRunning] = useState(false);
  const [statusJob, setStatusJob] = useState<StatusJobState | null>(null);
  const [statusRunning, setStatusRunning] = useState(false);

  // OU-wide roles: keep invoice branch filter aligned with active branch (AC-7).
  useEffect(() => {
    if (!canSwitchActiveBranch(user?.role) || !user?.branch_id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset filters when active branch changes
    setSelectedBranchId(user.branch_id);
    setPage(1);
  }, [user?.branch_id, user?.role]);

  const bulkBusy = exportRunning || statusRunning;

  // Keep filter/pagination state in the URL so it survives back-navigation from the detail page (I11)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchText) params.search = searchText;
    if (selectedBranchId) params.branch_id = selectedBranchId;
    if (selectedStatus) params.status = selectedStatus;
    if (billingMonth) params.billing_month = billingMonth;
    if (page !== 1) params.page = String(page);
    if (pageSize !== 10) params.page_size = String(pageSize);
    setSearchParams(params, { replace: true });
  }, [searchText, selectedBranchId, selectedStatus, billingMonth, page, pageSize, setSearchParams]);

  useEffect(() => {
    fetchInvoices({
      page,
      limit: pageSize,
      iv_no: searchText || undefined,
      branch_id: selectedBranchId,
      billing_month: billingMonth,
      status: selectedStatus,
    });
  }, [fetchInvoices, page, pageSize, searchText, selectedBranchId, billingMonth, selectedStatus]);

  useEffect(() => {
    fetchInvoiceAgents();
  }, [fetchInvoiceAgents]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  const onSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleSelectionChange = (keys: React.Key[]) => {
    if (keys.length > MAX_BULK_INVOICE_SELECTION) {
      message.warning(`You can select up to ${MAX_BULK_INVOICE_SELECTION} invoices per bulk action.`);
      setSelectedRowKeys(keys.slice(0, MAX_BULK_INVOICE_SELECTION));
      return;
    }
    setSelectedRowKeys(keys);
  };

  const rowSelection: TableRowSelection<Invoice> = {
    selectedRowKeys,
    onChange: handleSelectionChange,
    preserveSelectedRowKeys: true,
    getCheckboxProps: (record) => ({
      disabled:
        selectedRowKeys.length >= MAX_BULK_INVOICE_SELECTION
        && !selectedRowKeys.includes(record._id),
    }),
  };

  const refreshInvoiceList = () => {
    fetchInvoices({
      page,
      limit: pageSize,
      iv_no: searchText || undefined,
      branch_id: selectedBranchId,
      billing_month: billingMonth,
      status: selectedStatus,
    });
  };

  const openExport = (format: BulkExportFormat) => {
    setExportJob({
      ids: selectedRowKeys.map(String),
      format,
    });
  };

  const openStatusAction = (action: BulkStatusAction) => {
    if (statusJob !== null || bulkBusy) {
      return;
    }

    const count = selectedRowKeys.length;
    const isPaid = action === 'PAID';
    Modal.confirm({
      title: isPaid ? 'Mark as PAID' : 'Cancel Invoices',
      content: isPaid
        ? `Mark ${count} selected invoice(s) as PAID? Only invoices with status READY will be updated.`
        : `Cancel ${count} selected invoice(s)? Only READY, PENDING, MISSING_FEE, or ERROR invoices will be updated.`,
      okText: isPaid ? 'Mark as PAID' : 'Cancel Invoices',
      okButtonProps: isPaid ? undefined : { danger: true },
      onOk: () => {
        setStatusJob({
          ids: selectedRowKeys.map(String),
          action,
        });
      },
    });
  };

  const handleCreateInvoice = async () => {
    try {
      const values = await form.validateFields();
      const month = values.month.format('YYYY-MM');
      const success = await generateInvoices({
        month,
        branch_id: values.branch_id,
      });
      if (success) {
        setIsModalVisible(false);
        form.resetFields();
        fetchInvoices({
          page,
          limit: pageSize,
          iv_no: searchText || undefined,
          branch_id: selectedBranchId,
          billing_month: billingMonth,
          status: selectedStatus,
        });
      }
    } catch {
      message.error('Please fill in required fields');
    }
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice No',
      dataIndex: 'iv_no',
      key: 'iv_no',
    },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusTagColor(status)}>{status}</Tag>,
    },
    {
      title: 'Billing Month',
      dataIndex: 'billing_month',
      key: 'billing_month',
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string | null) => formatDate(date),
    },

    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number | null) => formatMoney(val),
    },

    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/invoices/${record._id}`)}
          size="small"
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Invoice Management"
      description="Manage invoices, search, and view historical billing details."
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Create Invoice
        </Button>
      }
    >

      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search Invoice No"
            defaultValue={searchText}
            onSearch={onSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            showSearch
            placeholder="Filter by Branch"
            style={{ width: 220 }}
            allowClear
            loading={loadingBranches}
            value={selectedBranchId}
            onChange={(val) => {
              setSelectedBranchId(val);
              setPage(1);
            }}
            options={branches.map((b) => ({
              value: b.branch_id,
              label: b.branch_code ? `${b.branch_code} - ${b.branch_name || b.branch_id}` : (b.branch_name || b.branch_id),
            }))}
            filterOption={(input, option) =>
              ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 180 }}
            allowClear
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setPage(1);
            }}
          >
            {INVOICE_STATUSES.map((s) => (
              <Select.Option key={s} value={s}>
                {s}
              </Select.Option>
            ))}
          </Select>
          <DatePicker
            picker="month"
            placeholder="Billing Month"
            style={{ width: 180 }}
            value={billingMonth ? dayjs(billingMonth, 'YYYY-MM') : null}
            onChange={(val) => {
              setBillingMonth(val ? val.format('YYYY-MM') : undefined);
              setPage(1);
            }}
          />
        </FiltersContainer>

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="_id"
          rowSelection={rowSelection}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true }}
          onChange={handleTableChange}
        />
      </PageContentCard>

      <BulkInvoiceActionBar
        selectedCount={selectedRowKeys.length}
        canExport={canExport}
        canWrite={canWrite}
        busy={bulkBusy}
        onExportPdf={() => openExport('pdf')}
        onExportExcel={() => openExport('xlsx')}
        onMarkPaid={() => openStatusAction('PAID')}
        onCancelInvoices={() => openStatusAction('VOID')}
        onClear={() => setSelectedRowKeys([])}
      />

      <BulkExportModal
        open={exportJob !== null}
        invoiceIds={exportJob?.ids ?? []}
        format={exportJob?.format ?? 'pdf'}
        onRunningChange={setExportRunning}
        onClose={(shouldClearSelection) => {
          setExportJob(null);
          setExportRunning(false);
          if (shouldClearSelection) {
            setSelectedRowKeys([]);
          }
        }}
      />

      <BulkStatusModal
        open={statusJob !== null}
        invoiceIds={statusJob?.ids ?? []}
        action={statusJob?.action ?? 'PAID'}
        onRunningChange={setStatusRunning}
        onClose={(shouldClearSelection, hadSuccess) => {
          setStatusJob(null);
          setStatusRunning(false);
          if (hadSuccess) {
            refreshInvoiceList();
          }
          if (shouldClearSelection) {
            setSelectedRowKeys([]);
          }
        }}
      />

      <Modal
        title="Create Invoice"
        open={isModalVisible}
        onOk={handleCreateInvoice}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={generating}
        okText="Generate"
      >
        <Form form={form} layout="vertical" initialValues={{ month: dayjs() }}>
          <Form.Item
            name="month"
            label="Select Month"
            rules={[{ required: true, message: 'Please select a month' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="branch_id"
            label="Select Branch (Optional)"
            tooltip="If not selected, invoices will be generated for all branches."
          >
            <Select
              showSearch
              placeholder="All Branches"
              allowClear
              loading={loadingBranches}
              options={branches.map((b) => ({
                value: b.branch_id,
                label: b.branch_code ? `${b.branch_code} - ${b.branch_name || b.branch_id}` : (b.branch_name || b.branch_id),
              }))}
              filterOption={(input, option) =>
                ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default InvoiceList;
