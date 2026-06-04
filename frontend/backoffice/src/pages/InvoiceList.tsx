import React, { useState } from 'react';
import { Card, Table, Tag, Input, Select, DatePicker, Space, Button, Typography, Modal, Form, message } from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { mockInvoices } from '../mock/invoiceData';
import type { Invoice } from '../types/invoice';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form] = Form.useForm();

  const handleCreateInvoice = async () => {
    try {
      await form.validateFields();
      setIsGenerating(true);
      // Mock API call
      setTimeout(() => {
        message.success('Invoices generated successfully');
        setIsGenerating(false);
        setIsModalVisible(false);
        form.resetFields();
      }, 1500);
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice No',
      dataIndex: 'iv_no',
      key: 'iv_no',
      sorter: (a, b) => a.iv_no.localeCompare(b.iv_no),
    },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch_name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'READY') color = 'warning';
        if (status === 'PAID') color = 'success';
        return <Tag color={color}>{status}</Tag>;
      },
      filters: [
        { text: 'READY', value: 'READY' },
        { text: 'PAID', value: 'PAID' },
      ],
      onFilter: (value, record) => record.status === (value as string),
    },
    {
      title: 'Net Win',
      dataIndex: 'net_win',
      key: 'net_win',
      align: 'right',
      render: (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      sorter: (a, b) => a.net_win - b.net_win,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Created Date',
      dataIndex: 'cr_date',
      key: 'cr_date',
      render: (date: string) => new Date(date).toLocaleString('th-TH'),
      sorter: (a, b) => new Date(a.cr_date).getTime() - new Date(b.cr_date).getTime(),
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

  // Apply search filter locally (for mock data)
  const filteredData = mockInvoices.filter((item) => {
    const matchSearch = item.iv_no.toLowerCase().includes(searchText.toLowerCase());
    const matchBranch = selectedBranch ? item.branch_name === selectedBranch : true;
    return matchSearch && matchBranch;
  });

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Invoice Management</Title>
          <Typography.Text type="secondary">จัดการใบแจ้งหนี้ ค้นหา และดูรายละเอียดบิลย้อนหลัง</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Create Invoice
        </Button>
      </div>

      <Card>
        <Space size="middle" style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search Invoice No"
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select 
            placeholder="Filter by Branch" 
            style={{ width: 200 }} 
            allowClear
            onChange={(val) => setSelectedBranch(val)}
          >
            {Array.from(new Set(mockInvoices.map(inv => inv.branch_name).filter(Boolean))).map(branch => (
              <Select.Option key={branch as string} value={branch as string}>{branch}</Select.Option>
            ))}
          </Select>
          <Select placeholder="Filter by Status" style={{ width: 150 }} allowClear>
            <Select.Option value="READY">READY</Select.Option>
            <Select.Option value="PAID">PAID</Select.Option>
          </Select>
          <RangePicker style={{ width: 250 }} />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 10, total: filteredData.length }}
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
        confirmLoading={isGenerating}
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
            <Select 
              placeholder="All Branches" 
              allowClear
            >
              {Array.from(new Set(mockInvoices.map(inv => inv.branch_name).filter(Boolean))).map(branch => (
                <Select.Option key={branch as string} value={branch as string}>{branch}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default InvoiceList;
