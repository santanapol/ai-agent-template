import type React from "react";
import { useEffect, useMemo } from "react";

import { CheckCircle, ChevronDown, FileQuestion, FileSpreadsheet, FileText, XCircle } from "lucide-react";

import { DataTable } from "@/components/DataTable";
import { DescriptionList } from "@/components/DescriptionList";
import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer } from "@/components/layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { formatDate, formatMoney, isDueDateOverdue, sortInvoiceTransactions, statusTagColor } from "./utils";

const TRANSACTION_PAGE_SIZE = 20;

function InvoiceDetailSkeleton() {
  return (
    <DetailContainer title="Invoice Details" maxWidth={null}>
      <div className="flex flex-col gap-4">
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

  const handleUpdateStatus = async () => {
    if (!id) return;
    const success = await markAsPaid(id);
    if (success) await fetchInvoiceDetail(id);
  };

  const handleCancelInvoice = async () => {
    if (!id) return;
    const success = await cancelInvoice(id);
    if (success) await fetchInvoiceDetail(id);
  };

  const confirmInvoiceAction = ({
    title,
    content,
    okText,
    onOk,
    danger,
  }: {
    title: string;
    content: string;
    okText: string;
    onOk: () => void | Promise<void>;
    danger?: boolean;
  }) => {
    if (!invoice || !id) return;
    void confirm({ title, content, okText, onOk, danger });
  };

  const promptUpdateStatus = () => {
    if (!invoice || !id) return;
    confirmInvoiceAction({
      title: "Mark as PAID",
      content: `Mark invoice #${invoice.iv_no} as PAID?`,
      okText: "Mark as PAID",
      onOk: handleUpdateStatus,
    });
  };

  const promptCancelInvoice = () => {
    if (!invoice || !id) return;
    confirmInvoiceAction({
      title: "Cancel Invoice",
      content: `Cancel invoice #${invoice.iv_no}?`,
      okText: "Cancel Invoice",
      danger: true,
      onOk: handleCancelInvoice,
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

  const summaryFooter = (
    <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalBet)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalNetWin)}</TableCell>
      <TableCell />
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalAmount)}</TableCell>
    </TableRow>
  );

  const metadataItems = [
    { label: "Invoice No", value: invoice.iv_no },
    { label: "Billing Month", value: invoice.billing_month || "-" },
    { label: "Created Date", value: formatDate(invoice.cr_date) },
    { label: "Bill To", value: invoice.branch_name || "-" },
    {
      label: "Due Date",
      value: (
        <span className={dueDateOverdue ? "font-semibold text-destructive" : undefined}>
          {formatDate(invoice.due_date)}
        </span>
      ),
    },
    ...(invoice.status === "PAID" && invoice.upd_date
      ? [
          {
            label: "Paid Date",
            value: <span className="font-semibold text-success">{formatDate(invoice.upd_date)}</span>,
          },
        ]
      : []),
  ];

  const showActions = canExport || (canWrite && (isReady || canCancel));

  return (
    <DetailContainer
      title={`Invoice Details: #${invoice.iv_no}`}
      backUrl={invoicesBackUrl}
      status={<StatusBadge status={invoice.status} variant={statusTagColor(invoice.status)} />}
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
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText aria-hidden="true" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet aria-hidden="true" />
                    Export Excel
                  </DropdownMenuItem>
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
                variant="destructive"
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
    >
      <div className="flex min-w-0 flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="border-b pb-4">
          <h2 className="font-bold text-2xl text-primary">Invoice</h2>
          <p className="text-muted-foreground text-sm">Zero Platform</p>
        </div>

        <DescriptionList title="Invoice Metadata" items={metadataItems} />
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
      </div>
    </DetailContainer>
  );
};

export default InvoiceDetail;
