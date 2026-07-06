import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/demo/data-table';
import { FilterSelectField } from '@/components/demo/filter-select-field';
import { MonthFilterField } from '@/components/demo/month-filter-field';
import { SearchFilterField } from '@/components/demo/search-filter-field';
import { StatusBadge } from '@/components/demo/status-badge';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockInvoices } from '../mockData';
import { formatCurrency, getInvoiceStatusVariant } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
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
  const [billingMonth, setBillingMonth] = useState('');

  const filteredData = useMemo(() => {
    return mockInvoices.filter((row) => {
      if (search && !row.iv_no.toLowerCase().includes(search.toLowerCase())) return false;
      if (branch && row.branch_name !== branch) return false;
      if (status && row.status !== status) return false;
      if (billingMonth && row.billing_month !== billingMonth) return false;
      return true;
    });
  }, [search, branch, status, billingMonth]);

  const resetFilters = () => {
    setSearch('');
    setBranch(undefined);
    setStatus(undefined);
    setBillingMonth('');
  };

  const columns = [
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
      key: 'billing_month',
      title: 'Billing Month',
      render: (row: (typeof mockInvoices)[number]) => row.billing_month || '-',
    },
    {
      key: 'due_date',
      title: 'Due Date',
      render: (row: (typeof mockInvoices)[number]) => row.due_date || '-',
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
      extra={
        <Button>
          <FileText data-icon="inline-start" />
          Create Invoice
        </Button>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="invoice-search"
            label="Search"
            placeholder="Invoice No..."
            value={search}
            onChange={setSearch}
          />
          <FilterSelectField
            id="invoice-branch"
            label="Branch"
            placeholder="Filter by Branch"
            value={branch}
            onChange={setBranch}
            options={BRANCH_OPTIONS}
            width="w-[200px]"
          />
          <FilterSelectField
            id="invoice-status"
            label="Status"
            placeholder="Filter by Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PAID', label: 'PAID' },
              { value: 'PENDING', label: 'PENDING' },
              { value: 'ERROR', label: 'ERROR' },
            ]}
            width="w-[160px]"
          />
          <MonthFilterField
            id="invoice-billing-month"
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

export default InvoicesListView;
