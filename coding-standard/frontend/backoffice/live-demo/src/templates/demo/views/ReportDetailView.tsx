import React from 'react';
import { Table, Button, Space, Descriptions, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockSmartReports, mockReportLineItems } from '../mockData';
import { formatCurrency, getReportStatusColor } from '../helpers';
import { detailBreadcrumb } from '../breadcrumbs';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };

const ReportDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedReportId,
}) => {
  const loading = useDemoTableLoading();
  const report = mockSmartReports.find((r) => r.id === selectedReportId) ?? mockSmartReports[0];
  const filteredLineItems = mockReportLineItems.filter((row) => row.report_id === report.id);
  const lineItems = filteredLineItems.length > 0
    ? filteredLineItems
    : [{
        id: 0,
        report_id: report.id,
        branch_name: 'All Branches (Summary)',
        revenue: report.total_revenue,
        commission: report.total_commission,
        net_profit: report.net_profit,
      }];

  const lineColumns = [
    { title: 'Branch', dataIndex: 'branch_name', key: 'branch_name' },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', align: 'right' as const, render: formatCurrency },
    { title: 'Commission', dataIndex: 'commission', key: 'commission', align: 'right' as const, render: formatCurrency },
    { title: 'Net Profit', dataIndex: 'net_profit', key: 'net_profit', align: 'right' as const, render: formatCurrency },
  ];

  return (
    <DetailContainer
      title={`Report Details: ${report.report_code}`}
      breadcrumbItems={detailBreadcrumb('Smart Reports', report.report_code, () => setDemoMode('smart-reports'))}
      onBack={() => setDemoMode(detailReturnMode)}
      extra={
        <Space>
          <Button icon={<DownloadOutlined />}>Download PDF</Button>
          <Button type="primary" icon={<DownloadOutlined />}>Export CSV</Button>
        </Space>
      }
    >
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Report Summary"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'code', label: 'Report Code', children: report.report_code },
            { key: 'status', label: 'Status', children: <Tag color={getReportStatusColor(report.status)}>{report.status}</Tag> },
            { key: 'name', label: 'Report Name', span: 2, children: report.report_name },
            { key: 'month', label: 'Billing Month', children: report.billing_month },
            { key: 'generated', label: 'Generated At', children: report.generated_at },
            { key: 'revenue', label: 'Total Revenue', children: formatCurrency(report.total_revenue) },
            { key: 'commission', label: 'Total Commission', children: formatCurrency(report.total_commission) },
            { key: 'profit', label: 'Net Profit', span: 2, children: formatCurrency(report.net_profit) },
          ]}
        />
      </PageContentCard>

      <PageContentCard title="Branch Breakdown">
        <Table
          dataSource={lineItems}
          columns={lineColumns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={tableLocale}
          scroll={TABLE_SCROLL}
        />
      </PageContentCard>
    </DetailContainer>
  );
};

export default ReportDetailView;
