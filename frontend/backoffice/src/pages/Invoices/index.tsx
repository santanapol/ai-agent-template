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
  message,
} from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useInvoices } from './hooks/useInvoices';
import { formatMoney, statusTagColor } from './utils';
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from '../../types/invoice';

const { Title } = Typography;

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
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

  const [searchText, setSearchText] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>();
  const [billingMonth, setBillingMonth] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm<{ month: Dayjs; branch_id?: string }>();

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
      title: 'Net Win',
      dataIndex: 'net_win',
      key: 'net_win',
      align: 'right',
      render: (val: number | null) => formatMoney(val),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number | null) => formatMoney(val),
    },
    {
      title: 'Created Date',
      dataIndex: 'cr_date',
      key: 'cr_date',
      render: (date: string) => new Date(date).toLocaleString('th-TH'),
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
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Invoice Management
          </Title>
          <Typography.Text type="secondary">
            จัดการใบแจ้งหนี้ ค้นหา และดูรายละเอียดบิลย้อนหลัง
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Create Invoice
        </Button>
      </div>

      <Card>
        <Space size="middle" style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search Invoice No"
            prefix={<SearchOutlined />}
            onSearch={onSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="Filter by Branch"
            style={{ width: 220 }}
            allowClear
            loading={loadingBranches}
            value={selectedBranchId}
            onChange={(val) => {
              setSelectedBranchId(val);
              setPage(1);
            }}
          >
            {branches.map((branch) => (
              <Select.Option key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name || branch.branch_code || branch.branch_id}
              </Select.Option>
            ))}
          </Select>
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
            onChange={(val) => {
              setBillingMonth(val ? val.format('YYYY-MM') : undefined);
              setPage(1);
            }}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="_id"
          loading={loading}
          pagination={{ current: page, pageSize, total, showSizeChanger: true }}
          onChange={handleTableChange}
        />
      </Card>

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
        <Form form={form} layout="vertical">
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
            <Select placeholder="All Branches" allowClear loading={loadingBranches}>
              {branches.map((branch) => (
                <Select.Option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name || branch.branch_code || branch.branch_id}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default InvoiceList;
