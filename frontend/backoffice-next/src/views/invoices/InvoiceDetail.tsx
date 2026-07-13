import type React from "react";
import { useEffect, useMemo } from "react";

import { CheckCircle, ChevronDown, FileQuestion, FileSpreadsheet, FileText, XCircle } from "lucide-react";

import { DataTable } from "@/components/DataTable";
import { DescriptionList } from "@/components/DescriptionList";
import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer } from "@/components/layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { triggerBlobDownload } from "@/lib/downloadBlob";
import { cn } from "@/lib/utils";
import { Link, useParams, useSearchParams } from "@/navigation/compat";

import { useInvoices } from "./hooks/useInvoices";
import { invoiceTransactionColumns } from "./invoiceTransactionColumns";
import {
  formatBillingMonth,
  formatDate,
  formatInvoiceStatusLabel,
  formatMoney,
  formatMoneyWithCurrency,
  isDueDateOverdue,
  resolveInvoiceAmountDue,
  sortInvoiceTransactions,
  statusTagColor,
} from "./utils";

const TRANSACTION_PAGE_SIZE = 20;

function InvoiceDetailSkeleton() {
  return (
    <DetailContainer title="Invoice" maxWidth={null} className="gap-4">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </DetailContainer>
  );
}

const InvoiceDetail: React.FC = () => {
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const canExport = usePermission("invoices:read");
  const canWrite = usePermission("invoices:write");
  const {
    invoice,
    transactions,
    detailLoading,
    transactionsLoading,
    updatingStatus,
    fetchInvoiceDetail,
    fetchTransactions,
    markAsPaid,
    cancelInvoice,
  } = useInvoices();

  const invoicesBackUrl = useMemo(() => {
    const returnSearch = searchParams.get("return");
    return returnSearch ? `/invoices?${returnSearch}` : "/invoices";
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    void fetchInvoiceDetail(id);
    void fetchTransactions(id);
  }, [id, fetchInvoiceDetail, fetchTransactions]);

  const sortedTransactions = useMemo(() => sortInvoiceTransactions(transactions), [transactions]);

  const totals = useMemo(() => {
    let totalBet = 0;
    let totalNetWin = 0;
    let totalAmount = 0;
    sortedTransactions.forEach(({ bet, net_win, amount }) => {
      totalBet += bet || 0;
      totalNetWin += net_win || 0;
      totalAmount += amount || 0;
    });
    return { totalBet, totalNetWin, totalAmount };
  }, [sortedTransactions]);

  if (detailLoading) {
    return <InvoiceDetailSkeleton />;
  }

  if (!invoice) {
    return (
      <DetailContainer title="Invoice Not Found" backUrl={invoicesBackUrl}>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Invoice not found</EmptyTitle>
            <EmptyDescription>
              The invoice may have been removed or you may not have access to view it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to={invoicesBackUrl} className={cn(buttonVariants({ variant: "outline" }))}>
              Back to Invoices
            </Link>
          </EmptyContent>
        </Empty>
      </DetailContainer>
    );
  }

  const refreshAfterAction = async (action: (invoiceId: string) => Promise<boolean>) => {
    if (!id) return;
    const success = await action(id);
    if (success) await fetchInvoiceDetail(id);
  };

  const promptUpdateStatus = () => {
    void confirm({
      title: "Mark as PAID",
      content: `Mark invoice #${invoice.iv_no} as PAID?`,
      okText: "Mark as PAID",
      onOk: () => refreshAfterAction(markAsPaid),
    });
  };

  const promptCancelInvoice = () => {
    void confirm({
      title: "Cancel Invoice",
      content: `Cancel invoice #${invoice.iv_no}?`,
      okText: "Cancel Invoice",
      danger: true,
      onOk: () => refreshAfterAction(cancelInvoice),
    });
  };

  const handleExportPDF = async () => {
    const { buildInvoicePdf } = await import("./export/buildInvoicePdf");
    const blob = buildInvoicePdf(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.pdf`);
    message.success("PDF exported successfully!");
  };

  const handleExportExcel = async () => {
    const { buildInvoiceXlsx } = await import("./export/buildInvoiceXlsx");
    const blob = buildInvoiceXlsx(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.xlsx`);
    message.success("Excel exported successfully!");
  };

  const isReady = invoice.status === "READY";
  const canCancel = ["READY", "PENDING", "MISSING_FEE", "ERROR"].includes(invoice.status);
  const dueDateOverdue = isDueDateOverdue(invoice.due_date, invoice.status);
  const statusLabel = formatInvoiceStatusLabel(invoice.status);

  const summaryFooter = (
    <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalBet)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalNetWin)}</TableCell>
      <TableCell />
      <TableCell className="text-right tabular-nums">
        {formatMoneyWithCurrency(totals.totalAmount, invoice.currency)}
      </TableCell>
    </TableRow>
  );

  const amountDue = resolveInvoiceAmountDue(invoice, sortedTransactions);

  const metadataItems = [
    {
      label: "Billing Month",
      value: <span className="tabular-nums">{formatBillingMonth(invoice.billing_month)}</span>,
    },
    { label: "Issue Date", value: <span className="tabular-nums">{formatDate(invoice.cr_date)}</span> },
    {
      label: "Due Date",
      value: (
        <span className={cn("tabular-nums", dueDateOverdue && "font-semibold text-destructive")}>
          {formatDate(invoice.due_date)}
        </span>
      ),
    },
    ...(invoice.currency
      ? [
          {
            label: "Currency",
            value: <span className="tabular-nums">{invoice.currency.toUpperCase()}</span>,
          },
        ]
      : []),
    ...(invoice.status === "PAID" && invoice.upd_date
      ? [
          {
            label: "Paid Date",
            value: <span className="font-semibold text-success tabular-nums">{formatDate(invoice.upd_date)}</span>,
          },
        ]
      : []),
  ];

  const showActions = canExport || (canWrite && (isReady || canCancel));

  return (
    <DetailContainer
      title="Invoice"
      description={`#${invoice.iv_no}`}
      backUrl={invoicesBackUrl}
      status={
        <StatusBadge
          status={statusLabel}
          variant={statusTagColor(invoice.status)}
          ariaLabel={`Status: ${statusLabel}`}
        />
      }
      extra={
        showActions ? (
          <div className="no-print flex flex-wrap items-center gap-2">
            {canExport ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="default" variant="outline" aria-label="Export invoice" />}>
                  Export
                  <ChevronDown data-icon="inline-end" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText aria-hidden="true" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel}>
                      <FileSpreadsheet aria-hidden="true" />
                      Export Excel
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {canWrite && isReady ? (
              <LoadingButton size="default" onClick={promptUpdateStatus} loading={updatingStatus}>
                <CheckCircle data-icon="inline-start" aria-hidden="true" />
                Mark as PAID
              </LoadingButton>
            ) : null}
            {canWrite && canCancel ? (
              <LoadingButton
                size="default"
                variant={isReady ? "outline" : "destructive"}
                className={isReady ? "text-destructive hover:text-destructive" : undefined}
                onClick={promptCancelInvoice}
                loading={updatingStatus}
              >
                <XCircle data-icon="inline-start" aria-hidden="true" />
                Cancel Invoice
              </LoadingButton>
            ) : null}
          </div>
        ) : null
      }
      maxWidth={null}
      className="gap-4"
    >
      <Card className="min-w-0 gap-0 py-0 shadow-sm">
        <CardHeader className="border-b py-4 [.border-b]:pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="text-muted-foreground text-sm">Zero Platform</p>
              <h2 className="text-balance font-semibold text-xl">Invoice #{invoice.iv_no}</h2>
              {invoice.branch_name ? (
                <p className="truncate text-muted-foreground text-sm">Bill to {invoice.branch_name}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <p className="text-muted-foreground text-sm">Amount due</p>
              <p className="font-semibold text-2xl tabular-nums">
                {formatMoneyWithCurrency(amountDue, invoice.currency)}
              </p>
              {dueDateOverdue ? <p className="font-medium text-destructive text-sm">Overdue</p> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <DescriptionList variant="plain" items={metadataItems} />
          <Separator />
          <DataTable
            columns={invoiceTransactionColumns}
            data={sortedTransactions}
            loading={transactionsLoading}
            rowKey="_id"
            pageSize={TRANSACTION_PAGE_SIZE}
            footer={summaryFooter}
            emptyTitle="No transactions"
            emptyDescription="This invoice has no line items yet."
          />
        </CardContent>
      </Card>
    </DetailContainer>
  );
};

export default InvoiceDetail;
