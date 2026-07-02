import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageContentCard, FiltersContainer } from '@/components/layout';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterSelectField } from '@/components/filter-select-field';
import { MonthFilterField } from '@/components/month-filter-field';
import { SearchFilterField } from '@/components/search-filter-field';
import { StatusBadge } from '@/components/status-badge';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import {
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  resolveInvoiceFilterBranches,
  setCachedInvoiceAgentBranches,
} from '@/lib/branchOptions';
import { fieldErrorIds } from '@/lib/fieldA11y';
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from '@/types/invoice';
import { MAX_BULK_INVOICE_SELECTION } from './bulk/constants';
import { BulkExportModal } from './components/BulkExportModal';
import { BulkInvoiceActionBar } from './components/BulkInvoiceActionBar';
import { BulkStatusModal } from './components/BulkStatusModal';
import type { BulkExportFormat } from './export/types';
import { useInvoices } from './hooks/useInvoices';
import { useInvoiceListFilters } from './hooks/useInvoiceListFilters';
import type { BulkStatusAction } from './status/types';
import {
  buildInvoiceListQuery,
  filterInvoicesBySearch,
  formatDate,
  formatMoney,
  statusTagColor,
} from './utils';

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
  const { confirm } = useConfirmDialog();
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

  const {
    searchParams,
    searchText,
    setSearchText,
    selectedBranchId,
    setSelectedBranchId,
    selectedStatus,
    setSelectedStatus,
    billingMonth,
    setBillingMonth,
    debouncedSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    isInvoiceSearchActive,
  } = useInvoiceListFilters();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [createMonth, setCreateMonth] = useState(dayjs().format('YYYY-MM'));
  const [createBranchId, setCreateBranchId] = useState<string | undefined>();
  const [createMonthError, setCreateMonthError] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [exportJob, setExportJob] = useState<ExportJobState | null>(null);
  const [exportRunning, setExportRunning] = useState(false);
  const [statusJob, setStatusJob] = useState<StatusJobState | null>(null);
  const [statusRunning, setStatusRunning] = useState(false);

  const bulkBusy = exportRunning || statusRunning;

  const invoiceListQuery = useMemo(
    () =>
      buildInvoiceListQuery({
        page,
        limit: pageSize,
        ivNo: debouncedSearchText,
        branchId: selectedBranchId,
        billingMonth,
        status: selectedStatus,
      }),
    [page, pageSize, debouncedSearchText, selectedBranchId, billingMonth, selectedStatus],
  );

  const tableInvoices = useMemo(
    () => filterInvoicesBySearch(invoices, debouncedSearchText),
    [invoices, debouncedSearchText],
  );

  const tableTotal = isInvoiceSearchActive ? tableInvoices.length : total;

  useEffect(() => {
    void fetchInvoices(invoiceListQuery);
  }, [fetchInvoices, invoiceListQuery]);

  useEffect(() => {
    void fetchInvoiceAgents();
  }, [fetchInvoiceAgents]);

  useEffect(() => {
    if (!user?.ou_id || branches.length === 0) return;
    setCachedInvoiceAgentBranches(user.ou_id, branches);
  }, [branches, user?.ou_id]);

  const invoiceBranches = useMemo(() => {
    const cached = user?.ou_id ? getCachedInvoiceAgentBranches(user.ou_id) : null;
    return resolveInvoiceFilterBranches(branches, invoices, cached);
  }, [branches, invoices, user]);

  const branchOptions = useMemo(
    () =>
      invoiceBranches.map((branch) => ({
        value: branch.branch_id,
        label: formatBranchOptionLabel(branch),
      })),
    [invoiceBranches],
  );

  const handleSelectionChange = (keys: string[]) => {
    if (keys.length > MAX_BULK_INVOICE_SELECTION) {
      message.warning(`You can select up to ${MAX_BULK_INVOICE_SELECTION} invoices per bulk action.`);
      setSelectedRowKeys(keys.slice(0, MAX_BULK_INVOICE_SELECTION));
      return;
    }
    setSelectedRowKeys(keys);
  };

  const refreshInvoiceList = () => {
    void fetchInvoices(invoiceListQuery);
  };

  const openExport = (format: BulkExportFormat) => {
    void confirm({
      title: `Export ${format.toUpperCase()}`,
      content: `Export ${selectedRowKeys.length} selected invoice(s) as ${format.toUpperCase()}?`,
      okText: 'Export',
      onOk: () => {
        setExportJob({ ids: selectedRowKeys, format });
      },
    });
  };

  const openStatusAction = (action: BulkStatusAction) => {
    if (statusJob !== null || bulkBusy) return;
    const count = selectedRowKeys.length;
    const isPaid = action === 'PAID';
    void confirm({
      title: isPaid ? 'Mark as PAID' : 'Cancel Invoices',
      content: isPaid
        ? `Mark ${count} selected invoice(s) as PAID? Only invoices with status READY will be updated.`
        : `Cancel ${count} selected invoice(s)? Only READY, PENDING, MISSING_FEE, or ERROR invoices will be updated.`,
      okText: isPaid ? 'Mark as PAID' : 'Cancel Invoices',
      danger: !isPaid,
      onOk: () => {
        setStatusJob({ ids: selectedRowKeys, action });
      },
    });
  };

  const handleCreateInvoice = async () => {
    if (!createMonth) {
      setCreateMonthError('Please select a month');
      return;
    }
    setCreateMonthError(undefined);
    const success = await generateInvoices({
      month: createMonth,
      branch_id: createBranchId,
    });
    if (success) {
      setIsModalVisible(false);
      setCreateBranchId(undefined);
      refreshInvoiceList();
    }
  };

  const createBranchItems = useMemo(
    () => branchOptions.map((option) => ({ value: option.value, label: option.label })),
    [branchOptions],
  );

  const columns: DataTableColumn<Invoice>[] = [
    { key: 'iv_no', title: 'Invoice No', accessor: 'iv_no' },
    {
      key: 'branch_name',
      title: 'Branch Name',
      render: (row) => row.branch_name || '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <StatusBadge status={row.status} variant={statusTagColor(row.status)} />,
    },
    {
      key: 'billing_month',
      title: 'Billing Month',
      render: (row) => row.billing_month || '-',
    },
    {
      key: 'due_date',
      title: 'Due Date',
      render: (row) => formatDate(row.due_date),
    },
    {
      key: 'amount',
      title: 'Amount',
      align: 'right',
      render: (row) => formatMoney(row.amount),
    },
    {
      key: 'action',
      title: 'Action',
      render: (row) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`View invoice ${row.iv_no}`}
                onClick={() =>
                  navigate(`/invoices/${row._id}`, {
                    state: { listSearch: searchParams.toString() },
                  })
                }
              >
                <Eye />
              </Button>
            }
          />
          <TooltipContent>View details</TooltipContent>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <PageContainer
        title="Invoice Management"
        description="Manage invoices, search, and view historical billing details."
        extra={
          canWrite ? (
            <Button onClick={() => setIsModalVisible(true)}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create Invoice
            </Button>
          ) : null
        }
      >
        <PageContentCard>
          <FiltersContainer>
            <SearchFilterField
              id="invoice-search"
              label="Search"
              placeholder="Search Invoice No"
              value={searchText}
              onChange={(v) => {
                setSearchText(v);
                setPage(1);
              }}
            />
            <FilterSelectField
              id="invoice-branch"
              label="Branch"
              placeholder="Filter by Branch"
              value={selectedBranchId}
              onChange={(v) => {
                setSelectedBranchId(v);
                setPage(1);
              }}
              options={branchOptions}
              width="w-[220px]"
              searchable
              searchPlaceholder="Search branch"
            />
            <FilterSelectField
              id="invoice-status"
              label="Status"
              placeholder="Filter by Status"
              value={selectedStatus}
              onChange={(v) => {
                setSelectedStatus(v as InvoiceStatus | undefined);
                setPage(1);
              }}
              options={INVOICE_STATUSES.map((s) => ({ value: s, label: s }))}
              width="w-[180px]"
            />
            <MonthFilterField
              id="invoice-billing-month"
              label="Billing Month"
              value={billingMonth}
              onChange={(v) => {
                setBillingMonth(v);
                setPage(1);
              }}
            />
          </FiltersContainer>

          <DataTable
            columns={columns}
            data={tableInvoices}
            loading={loading}
            rowKey="_id"
            pagination={{
              page: isInvoiceSearchActive ? 1 : page,
              pageSize,
              pageSizeOptions: [10, 20, 50],
              total: tableTotal,
              onChange: (nextPage, nextSize) => {
                if (isInvoiceSearchActive) return;
                setPage(nextPage);
                setPageSize(nextSize);
              },
            }}
            rowSelection={{
              selectedKeys: selectedRowKeys,
              onChange: handleSelectionChange,
              getRowDisabled: (row) =>
                selectedRowKeys.length >= MAX_BULK_INVOICE_SELECTION &&
                !selectedRowKeys.includes(row._id),
            }}
          />
        </PageContentCard>
      </PageContainer>

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
          if (shouldClearSelection) setSelectedRowKeys([]);
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
          if (hadSuccess) refreshInvoiceList();
          if (shouldClearSelection) setSelectedRowKeys([]);
        }}
      />

      <Dialog
        open={isModalVisible}
        onOpenChange={(open) => {
          if (!open && generating) return;
          setIsModalVisible(open);
        }}
      >
        <DialogContent showCloseButton={!generating}>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Generate invoices for the selected billing month and optional branch.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!createMonthError}>
            <FieldLabel htmlFor="create-invoice-month">Billing month</FieldLabel>
            <MonthFilterField
              id="create-invoice-month"
              label=""
              value={createMonth}
              onChange={(value) => {
                setCreateMonth(value);
                if (createMonthError) setCreateMonthError(undefined);
              }}
              aria-invalid={!!createMonthError}
              aria-describedby={createMonthError ? fieldErrorIds('create-invoice-month').describedBy : undefined}
            />
            {createMonthError ? (
              <FieldDescription id={fieldErrorIds('create-invoice-month').errorId} className="text-destructive">
                {createMonthError}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="create-invoice-branch">Select Branch (Optional)</FieldLabel>
            <FieldDescription>If not selected, invoices will be generated for all branches.</FieldDescription>
            <Select
              value={createBranchId ?? ''}
              items={createBranchItems}
              onValueChange={(val) => setCreateBranchId(val || undefined)}
            >
              <SelectTrigger id="create-invoice-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Branches</SelectLabel>
                  {branchOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalVisible(false)} disabled={generating}>
              Cancel
            </Button>
            <LoadingButton loading={generating || loadingBranches} onClick={() => void handleCreateInvoice()}>
              Generate
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceList;
