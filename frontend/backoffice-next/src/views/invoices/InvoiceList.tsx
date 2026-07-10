import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";

import type { OnChangeFn, RowSelectionState, VisibilityState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Plus } from "lucide-react";

import {
  DataTablePagination,
  DataTableSelectionBar,
  DataTableToolbarActions,
  DataTableView,
  useServerDataTable,
} from "@/components/data-table";
import { LoadingButton } from "@/components/LoadingButton";
import { ListPageCard } from "@/components/layout";
import { type InlineFilterOption, InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import { MonthFilterField } from "@/components/MonthFilterField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import {
  canSwitchActiveBranch,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  isZeroHqBranchId,
  resolveInvoiceFilterBranches,
  setCachedInvoiceAgentBranches,
} from "@/lib/branchOptions";
import { resolveBranchScopedEmptyState } from "@/lib/branchScopedEmptyState";
import { formatDisplayMonth } from "@/lib/dateUtils";
import { fieldErrorIds } from "@/lib/fieldA11y";
import { useNavigate } from "@/navigation/compat";
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from "@/types/invoice";

import { MAX_BULK_INVOICE_SELECTION } from "./bulk/constants";
import { BulkInvoiceActionBar } from "./components/BulkInvoiceActionBar";
import type { BulkExportFormat } from "./export/types";
import { useInvoiceListFilters } from "./hooks/useInvoiceListFilters";
import { useInvoices } from "./hooks/useInvoices";
import { createInvoiceColumns } from "./invoice-columns";
import type { BulkStatusAction } from "./status/types";
import { buildInvoiceListQuery, buildInvoiceListSearchParams, INVOICE_BRANCH_FILTER_ALL } from "./utils";

const BulkExportModal = dynamic(
  () => import("./components/BulkExportModal").then((module) => ({ default: module.BulkExportModal })),
  { ssr: false },
);
const BulkStatusModal = dynamic(
  () => import("./components/BulkStatusModal").then((module) => ({ default: module.BulkStatusModal })),
  { ssr: false },
);

interface ExportJobState {
  ids: string[];
  format: BulkExportFormat;
}

interface StatusJobState {
  ids: string[];
  action: BulkStatusAction;
}

function buildBillingMonthOptions(currentValue: string): InlineFilterOption[] {
  const options: InlineFilterOption[] = [];
  const seen = new Set<string>();

  const addMonth = (value: string) => {
    if (seen.has(value)) return;
    seen.add(value);
    options.push({ value, label: formatDisplayMonth(value) });
  };

  if (currentValue) addMonth(currentValue);
  for (let index = 0; index < 24; index += 1) {
    addMonth(dayjs().subtract(index, "month").format("YYYY-MM"));
  }

  return options;
}

const InvoiceList: React.FC = () => {
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canExport = usePermission("invoices:read");
  const canWrite = usePermission("invoices:write");
  const canFilterBranch = canSwitchActiveBranch(user?.role);
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
  } = useInvoiceListFilters();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [createMonth, setCreateMonth] = useState(dayjs().format("YYYY-MM"));
  const [createBranchId, setCreateBranchId] = useState<string | undefined>();
  const [createMonthError, setCreateMonthError] = useState<string | undefined>();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [exportJob, setExportJob] = useState<ExportJobState | null>(null);
  const [exportRunning, setExportRunning] = useState(false);
  const [statusJob, setStatusJob] = useState<StatusJobState | null>(null);
  const [statusRunning, setStatusRunning] = useState(false);
  const invoiceAgentsAuthKeyRef = useRef<string | null>(null);

  const bulkBusy = exportRunning || statusRunning;

  const selectedRowKeys = useMemo(() => Object.keys(rowSelection).filter((id) => rowSelection[id]), [rowSelection]);

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

  useEffect(() => {
    const controller = new AbortController();
    void fetchInvoices(invoiceListQuery, controller.signal);
    return () => controller.abort();
  }, [fetchInvoices, invoiceListQuery]);

  useEffect(() => {
    const authKey = `${user?.ou_id ?? ""}:${user?.role ?? ""}`;
    if (invoiceAgentsAuthKeyRef.current === authKey) return;
    invoiceAgentsAuthKeyRef.current = authKey;
    void fetchInvoiceAgents();
  }, [fetchInvoiceAgents, user?.ou_id, user?.role]);

  useEffect(() => {
    // Only persist full catalog results from fetchInvoiceAgents — never limited switcher lists.
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

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
    (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const keys = Object.keys(next).filter((id) => next[id]);
        if (keys.length > MAX_BULK_INVOICE_SELECTION) {
          message.warning(`You can select up to ${MAX_BULK_INVOICE_SELECTION} invoices per bulk action.`);
          return Object.fromEntries(keys.slice(0, MAX_BULK_INVOICE_SELECTION).map((id) => [id, true]));
        }
        return next;
      });
    },
    [message],
  );

  const refreshInvoiceList = () => {
    void fetchInvoices(invoiceListQuery);
  };

  const openExport = (format: BulkExportFormat) => {
    void confirm({
      title: `Export ${format.toUpperCase()}`,
      content: `Export ${selectedRowKeys.length} selected invoice(s) as ${format.toUpperCase()}?`,
      okText: "Export",
      onOk: () => {
        setExportJob({ ids: selectedRowKeys, format });
      },
    });
  };

  const openStatusAction = (action: BulkStatusAction) => {
    if (statusJob !== null || bulkBusy) return;
    const count = selectedRowKeys.length;
    const isPaid = action === "PAID";
    void confirm({
      title: isPaid ? "Mark as PAID" : "Cancel Invoices",
      content: isPaid
        ? `Mark ${count} selected invoice(s) as PAID? Only invoices with status READY will be updated.`
        : `Cancel ${count} selected invoice(s)? Only READY, PENDING, MISSING_FEE, or ERROR invoices will be updated.`,
      okText: isPaid ? "Mark as PAID" : "Cancel Invoices",
      danger: !isPaid,
      onOk: () => {
        setStatusJob({ ids: selectedRowKeys, action });
      },
    });
  };

  const handleCreateInvoice = async () => {
    if (!createMonth) {
      setCreateMonthError("Please select a month");
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

  const listSearch = useMemo(
    () =>
      buildInvoiceListSearchParams({
        searchText,
        selectedBranchId,
        selectedStatus,
        billingMonth,
        page,
        pageSize,
      }).toString(),
    [searchText, selectedBranchId, selectedStatus, billingMonth, page, pageSize],
  );

  const columnHandlers = useMemo(
    () => ({
      onView: (invoice: Invoice, search: string) => {
        navigate(`/invoices/${invoice._id}`, {
          state: { listSearch: search },
        });
      },
      listSearch,
    }),
    [listSearch, navigate],
  );

  const columns = useMemo(() => createInvoiceColumns(columnHandlers), [columnHandlers]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  const table = useServerDataTable({
    data: invoices,
    columns,
    pageIndex: page - 1,
    pageSize,
    pageCount,
    onPaginationChange: ({ pageIndex, pageSize: nextPageSize }) => {
      const nextPage = pageIndex + 1;
      setPage((prev) => (prev === nextPage ? prev : nextPage));
      setPageSize((prev) => (prev === nextPageSize ? prev : nextPageSize));
    },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    rowSelection,
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: (row) => selectedRowKeys.length < MAX_BULK_INVOICE_SELECTION || row.getIsSelected(),
    getRowId: (row) => row._id,
  });

  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Status" },
      ...INVOICE_STATUSES.map((status) => ({ value: status, label: status })),
    ],
    [],
  );

  const branchFilterOptions = useMemo(
    () => [{ value: INVOICE_BRANCH_FILTER_ALL, label: "All Branches" }, ...branchOptions],
    [branchOptions],
  );

  const branchScopedEmpty = useMemo(
    () =>
      resolveBranchScopedEmptyState({
        activeBranchId: user?.branch_id,
        resource: "invoices",
        scopedToActiveBranch: !canFilterBranch,
        hasNoRows: !loading && total === 0,
      }),
    [user?.branch_id, canFilterBranch, loading, total],
  );

  const billingMonthOptions = useMemo(() => buildBillingMonthOptions(billingMonth), [billingMonth]);

  return (
    <>
      <ListPageCard
        title="Invoice Management"
        description="Search, generate, and review billing invoices."
        toolbar={
          <>
            <ListPageSearch
              id="invoice-search"
              placeholder="Search Invoice No…"
              value={searchText}
              onChange={(value) => {
                setSearchText(value);
                setPage(1);
              }}
            />
            {canExport ? <DataTableToolbarActions table={table} exportFileName="invoices" /> : null}
            {canWrite ? (
              <Button onClick={() => setIsModalVisible(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Create Invoice
              </Button>
            ) : null}
          </>
        }
        filterRow={
          <>
            <InlineFilterSelect
              id="invoice-billing-month"
              prefix="Month:"
              value={billingMonth}
              options={billingMonthOptions}
              onChange={(value) => {
                setBillingMonth(value);
                setPage(1);
              }}
            />
            <InlineFilterSelect
              id="invoice-status"
              prefix="Status:"
              value={selectedStatus ?? "all"}
              options={statusFilterOptions}
              onChange={(value) => {
                setSelectedStatus(value === "all" ? undefined : (value as InvoiceStatus));
                setPage(1);
              }}
            />
            {canFilterBranch ? (
              <InlineFilterSelect
                id="invoice-branch"
                prefix="Branch:"
                value={selectedBranchId ?? INVOICE_BRANCH_FILTER_ALL}
                options={branchFilterOptions}
                onChange={(value) => {
                  setSelectedBranchId(value === INVOICE_BRANCH_FILTER_ALL ? undefined : value);
                  setPage(1);
                }}
              />
            ) : null}
          </>
        }
        selectionBar={<DataTableSelectionBar table={table} />}
      >
        <DataTableView
          table={table}
          loading={loading}
          emptyTitle={branchScopedEmpty?.emptyTitle}
          emptyDescription={branchScopedEmpty?.emptyDescription}
          emptyAction={
            canWrite
              ? {
                  label: "Create Invoice",
                  onClick: () => setIsModalVisible(true),
                }
              : undefined
          }
        />
        <DataTablePagination table={table} total={total} pageSizeOptions={[10, 20, 50]} />
      </ListPageCard>

      <BulkInvoiceActionBar
        selectedCount={selectedRowKeys.length}
        canExport={canExport}
        canWrite={canWrite}
        busy={bulkBusy}
        onExportPdf={() => openExport("pdf")}
        onExportExcel={() => openExport("xlsx")}
        onMarkPaid={() => openStatusAction("PAID")}
        onCancelInvoices={() => openStatusAction("VOID")}
        onClear={() => setRowSelection({})}
      />

      <BulkExportModal
        open={exportJob !== null}
        invoiceIds={exportJob?.ids ?? []}
        format={exportJob?.format ?? "pdf"}
        onRunningChange={setExportRunning}
        onClose={(shouldClearSelection) => {
          setExportJob(null);
          setExportRunning(false);
          if (shouldClearSelection) setRowSelection({});
        }}
      />

      <BulkStatusModal
        open={statusJob !== null}
        invoiceIds={statusJob?.ids ?? []}
        action={statusJob?.action ?? "PAID"}
        onRunningChange={setStatusRunning}
        onClose={(shouldClearSelection, hadSuccess) => {
          setStatusJob(null);
          setStatusRunning(false);
          if (hadSuccess) refreshInvoiceList();
          if (shouldClearSelection) setRowSelection({});
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
            <DialogDescription>Generate invoices for the selected billing month and optional branch.</DialogDescription>
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
              aria-describedby={createMonthError ? fieldErrorIds("create-invoice-month").describedBy : undefined}
            />
            {createMonthError ? (
              <FieldDescription id={fieldErrorIds("create-invoice-month").errorId} className="text-destructive">
                {createMonthError}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="create-invoice-branch">Select Branch (Optional)</FieldLabel>
            <FieldDescription>If not selected, invoices will be generated for all branches.</FieldDescription>
            <Select
              value={createBranchId ?? ""}
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
