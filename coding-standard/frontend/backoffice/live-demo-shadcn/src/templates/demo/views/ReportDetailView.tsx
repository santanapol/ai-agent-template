import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DescriptionList } from '@/components/demo/description-list';
import { DataTable } from '@/components/demo/data-table';
import { StatusBadge } from '@/components/demo/status-badge';
import { DetailContainer, PageContentCard } from '../../index';
import { mockSmartReports, mockReportLineItems } from '../mockData';
import { formatCurrency, getReportStatusVariant } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';

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
    { key: 'branch_name', title: 'Branch', accessor: 'branch_name' as const },
    {
      key: 'revenue',
      title: 'Revenue',
      align: 'right' as const,
      render: (row: (typeof lineItems)[number]) => formatCurrency(row.revenue),
    },
    {
      key: 'commission',
      title: 'Commission',
      align: 'right' as const,
      render: (row: (typeof lineItems)[number]) => formatCurrency(row.commission),
    },
    {
      key: 'net_profit',
      title: 'Net Profit',
      align: 'right' as const,
      render: (row: (typeof lineItems)[number]) => formatCurrency(row.net_profit),
    },
  ];

  return (
    <DetailContainer
      title={`Report Details: ${report.report_code}`}
      onBack={() => setDemoMode(detailReturnMode)}
      extra={
        <>
          <Button variant="outline">
            <Download data-icon="inline-start" />
            Download PDF
          </Button>
          <Button>
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        </>
      }
    >
      <PageContentCard className="max-w-[720px]">
        <DescriptionList
          title="Report Summary"
          items={[
            { label: 'Report Code', value: report.report_code },
            {
              label: 'Status',
              value: <StatusBadge status={report.status} variant={getReportStatusVariant(report.status)} />,
            },
            { label: 'Report Name', value: report.report_name, span: 2 },
            { label: 'Billing Month', value: report.billing_month },
            { label: 'Generated At', value: report.generated_at },
            { label: 'Total Revenue', value: formatCurrency(report.total_revenue) },
            { label: 'Total Commission', value: formatCurrency(report.total_commission) },
            { label: 'Net Profit', value: formatCurrency(report.net_profit), span: 2 },
          ]}
        />
      </PageContentCard>

      <PageContentCard title="Branch Breakdown">
        <DataTable columns={lineColumns} data={lineItems} loading={loading} rowKey="id" pageSize={10} />
      </PageContentCard>
    </DetailContainer>
  );
};

export default ReportDetailView;
