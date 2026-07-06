import { useMemo, useState } from 'react';
import { Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/demo/data-table';
import { FilterSelectField } from '@/components/demo/filter-select-field';
import { MonthFilterField } from '@/components/demo/month-filter-field';
import { SearchFilterField } from '@/components/demo/search-filter-field';
import { StatusBadge } from '@/components/demo/status-badge';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockSmartReports } from '../mockData';
import { formatCurrency, getReportStatusVariant } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const SmartReportsView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedReportId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [billingMonth, setBillingMonth] = useState('');

  const filteredData = useMemo(() => {
    return mockSmartReports.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.report_code} ${row.report_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && row.status !== status) return false;
      if (billingMonth && row.billing_month !== billingMonth) return false;
      return true;
    });
  }, [search, status, billingMonth]);

  const resetFilters = () => {
    setSearch('');
    setStatus(undefined);
    setBillingMonth('');
  };

  const columns = [
    { key: 'report_code', title: 'Report Code', accessor: 'report_code' as const },
    { key: 'report_name', title: 'Report Name', accessor: 'report_name' as const },
    {
      key: 'billing_month',
      title: 'Billing Month',
      render: (row: (typeof mockSmartReports)[number]) => row.billing_month || '-',
    },
    {
      key: 'total_revenue',
      title: 'Total Revenue',
      align: 'right' as const,
      render: (row: (typeof mockSmartReports)[number]) => formatCurrency(row.total_revenue),
    },
    {
      key: 'total_commission',
      title: 'Commission',
      align: 'right' as const,
      render: (row: (typeof mockSmartReports)[number]) => formatCurrency(row.total_commission),
    },
    {
      key: 'net_profit',
      title: 'Net Profit',
      align: 'right' as const,
      render: (row: (typeof mockSmartReports)[number]) => formatCurrency(row.net_profit),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row: (typeof mockSmartReports)[number]) => (
        <StatusBadge status={row.status} variant={getReportStatusVariant(row.status)} />
      ),
    },
    { key: 'generated_at', title: 'Generated At', accessor: 'generated_at' as const },
    {
      key: 'action',
      title: 'Action',
      render: (row: (typeof mockSmartReports)[number]) => (
        <div className="flex gap-2">
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() => {
              setSelectedReportId(row.id);
              openDetail({ setDemoMode, setDetailReturnMode }, 'report-detail', 'smart-reports');
            }}
          >
            View Details
          </Button>
          <Button variant="link" className="h-auto px-0">
            <Download data-icon="inline-start" />
            Download
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Smart Reports"
      description="Financial calculation and processing reports. Generate, review, and export settlement summaries."
      extra={
        <Button>
          <Play data-icon="inline-start" />
          Generate Report
        </Button>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="report-search"
            label="Search"
            placeholder="Report name or code..."
            value={search}
            onChange={setSearch}
          />
          <FilterSelectField
            id="report-status"
            label="Status"
            placeholder="Filter by Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'COMPLETED', label: 'COMPLETED' },
              { value: 'PROCESSING', label: 'PROCESSING' },
              { value: 'FAILED', label: 'FAILED' },
            ]}
            width="w-[160px]"
          />
          <MonthFilterField
            id="report-billing-month"
            label="Billing Month"
            value={billingMonth}
            onChange={setBillingMonth}
          />
        </FiltersContainer>
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          rowKey="id"
          emptyAction={{ label: 'Clear filters', onClick: resetFilters }}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default SmartReportsView;
