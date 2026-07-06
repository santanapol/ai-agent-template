import { DollarSign, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/demo/stat-card';
import { StatusBadge } from '@/components/demo/status-badge';
import { DataTable } from '@/components/demo/data-table';
import { PageContainer, PageContentCard } from '../../index';
import { mockInvoices } from '../mockData';
import { formatCurrency, getInvoiceStatusVariant, statisticNumberFormatter, statisticRateFormatter } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const DashboardView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedInvoiceCode } = props;
  const loading = useDemoTableLoading();

  const invoiceColumns = [
    { key: 'iv_no', title: 'Invoice No', accessor: 'iv_no' as const },
    {
      key: 'branch_name',
      title: 'Branch Name',
      render: (row: (typeof mockInvoices)[number]) => row.branch_name || '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (row: (typeof mockInvoices)[number]) => (
        <StatusBadge status={row.status} variant={getInvoiceStatusVariant(row.status)} />
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      align: 'right' as const,
      render: (row: (typeof mockInvoices)[number]) => formatCurrency(row.amount),
    },
    {
      key: 'action',
      title: 'Action',
      render: (row: (typeof mockInvoices)[number]) => (
        <Button
          variant="link"
          className="h-auto px-0"
          onClick={() => {
            setSelectedInvoiceCode(row.iv_no);
            openDetail({ setDemoMode, setDetailReturnMode }, 'invoice-detail', 'dashboard');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Analytical snapshot of agent invoice distribution, collection success, and active revenue flow."
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Billed" value={statisticNumberFormatter(254000)} suffix="THB" icon={DollarSign} />
        <StatCard title="Commissions Earned" value={statisticNumberFormatter(12700)} suffix="THB" icon={CheckCircle2} iconTone="success" />
        <StatCard title="Unpaid/Pending" value={statisticNumberFormatter(209000)} suffix="THB" icon={Info} iconTone="warning" />
        <StatCard title="Paid Rate" value={statisticRateFormatter(87.5)} suffix="%" icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <PageContentCard className="lg:col-span-2" title="Latest Generated Invoices">
          <DataTable
            columns={invoiceColumns}
            data={mockInvoices}
            loading={loading}
            rowKey="id"
            pageSize={10}
          />
        </PageContentCard>
        <PageContentCard title="Billing Gateway Status">
          <div className="flex flex-col gap-4">
            <Alert>
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>API Gateway Health</AlertTitle>
              <AlertDescription>
                <span className="font-semibold text-success">Active (99.98% SLA)</span>
              </AlertDescription>
            </Alert>
            <Alert>
              <Info aria-hidden="true" />
              <AlertTitle>E-Invoice Sync</AlertTitle>
              <AlertDescription>
                <span className="font-semibold">All Clear</span>
              </AlertDescription>
            </Alert>
          </div>
        </PageContentCard>
      </div>
    </PageContainer>
  );
};

export default DashboardView;
