import React, { useMemo, useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { FileTextOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockInvoices } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { formatCurrency, getInvoiceStatusColor } from '../helpers';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const BRANCH_OPTIONS = [
  { value: 'Bangkok Central', label: 'Bangkok Central' },
  { value: 'Chiang Mai North', label: 'Chiang Mai North' },
  { value: 'Korat Gateway', label: 'Korat Gateway' },
  { value: 'Phuket Beach', label: 'Phuket Beach' },
];

const InvoicesListView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedInvoiceCode } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [billingMonth, setBillingMonth] = useState<Dayjs | null>(null);

  const filteredData = useMemo(() => {
    return mockInvoices.filter((row) => {
      if (search && !row.iv_no.toLowerCase().includes(search.toLowerCase())) return false;
      if (branch && row.branch_name !== branch) return false;
      if (status && row.status !== status) return false;
      if (billingMonth && row.billing_month !== billingMonth.format('YYYY-MM')) return false;
      return true;
    });
  }, [search, branch, status, billingMonth]);

  const columns = [
    { title: 'Invoice No', dataIndex: 'iv_no', key: 'iv_no' },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch_name',
      ellipsis: true,
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={getInvoiceStatusColor(s)}>{s}</Tag>,
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
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (val: number | null) => formatCurrency(val),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockInvoices)[number]) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedInvoiceCode(record.iv_no);
            openDetail({ setDemoMode, setDetailReturnMode }, 'invoice-detail', 'invoices');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Invoices Management"
      description="Manage agent billing invoices. Search by invoice number, filter by branch or status."
      breadcrumbItems={listBreadcrumb('Invoices Management')}
      extra={
        <Space>
          <Button type="primary" icon={<FileTextOutlined />}>Create Invoice</Button>
        </Space>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search Invoice No..."
            style={{ width: '100%', maxWidth: 300 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by Branch"
            style={{ width: 200 }}
            allowClear
            value={branch}
            onChange={setBranch}
            options={BRANCH_OPTIONS}
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PAID', label: 'PAID' },
              { value: 'PENDING', label: 'PENDING' },
              { value: 'ERROR', label: 'ERROR' },
            ]}
          />
          <DatePicker
            picker="month"
            placeholder="Billing Month"
            style={{ width: 180 }}
            value={billingMonth}
            onChange={setBillingMonth}
            allowClear
          />
        </FiltersContainer>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={tableLocale}
          pagination={{ pageSize: 5 }}
          scroll={TABLE_SCROLL}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default InvoicesListView;
