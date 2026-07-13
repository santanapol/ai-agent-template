import React, { useMemo, useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { DownloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockSmartReports } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { formatCurrency, getReportStatusColor } from '../helpers';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const SmartReportsView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedReportId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [billingMonth, setBillingMonth] = useState<Dayjs | null>(null);

  const filteredData = useMemo(() => {
    return mockSmartReports.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.report_code} ${row.report_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && row.status !== status) return false;
      if (billingMonth && row.billing_month !== billingMonth.format('YYYY-MM')) return false;
      return true;
    });
  }, [search, status, billingMonth]);

  const columns = [
    { title: 'Report Code', dataIndex: 'report_code', key: 'report_code' },
    { title: 'Report Name', dataIndex: 'report_name', key: 'report_name', ellipsis: true },
    { title: 'Billing Month', dataIndex: 'billing_month', key: 'billing_month', render: (v: string) => v || '-' },
    { title: 'Total Revenue', dataIndex: 'total_revenue', key: 'total_revenue', align: 'right' as const, render: formatCurrency },
    { title: 'Commission', dataIndex: 'total_commission', key: 'total_commission', align: 'right' as const, render: formatCurrency },
    { title: 'Net Profit', dataIndex: 'net_profit', key: 'net_profit', align: 'right' as const, render: formatCurrency },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={getReportStatusColor(s)}>{s}</Tag> },
    { title: 'Generated At', dataIndex: 'generated_at', key: 'generated_at' },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockSmartReports)[number]) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setSelectedReportId(record.id);
              openDetail({ setDemoMode, setDetailReturnMode }, 'report-detail', 'smart-reports');
            }}
          >
            View Details
          </Button>
          <Button type="link" icon={<DownloadOutlined />}>Download</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Smart Reports"
      description="Financial calculation and processing reports. Generate, review, and export settlement summaries."
      breadcrumbItems={listBreadcrumb('Smart Reports')}
      extra={<Space><Button type="primary" icon={<PlayCircleOutlined />}>Generate Report</Button></Space>}
    >
      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search report name or code..."
            style={{ width: '100%', maxWidth: 300 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            value={status}
            onChange={setStatus}
            options={[
              { value: 'COMPLETED', label: 'COMPLETED' },
              { value: 'PROCESSING', label: 'PROCESSING' },
              { value: 'FAILED', label: 'FAILED' },
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

export default SmartReportsView;
