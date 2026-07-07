import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  XCircle,
} from 'lucide-react';
import { DescriptionList } from '@/components/DescriptionList';
import { DetailContainer } from '@/components/layout';
import { DataTable } from '@/components/DataTable';
import { LoadingButton } from '@/components/LoadingButton';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { usePageBreadcrumb } from '@/contexts/PageBreadcrumbContext';
import { usePermission } from '@/hooks/usePermission';
import { useInvoices } from './hooks/useInvoices';
import {
  formatDate,
  formatMoney,
  sortInvoiceTransactions,
  statusTagColor,
} from './utils';
import { buildInvoicePdf } from './export/buildInvoicePdf';
import { buildInvoiceXlsx } from './export/buildInvoiceXlsx';
import { triggerBlobDownload } from './export/downloadBlob';
import { invoiceTransactionColumns } from './invoiceTransactionColumns';

const TRANSACTION_PAGE_SIZE = 20;

type InvoiceListLocationState = {
  listSearch?: string;
};

function InvoiceDetailSkeleton() {
  return (
    <DetailContainer title="Invoice Details" maxWidth={900}>
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
  const navigate = useNavigate();
  const location = useLocation();
  const canExport = usePermission('invoices:read');
  const canWrite = usePermission('invoices:write');
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
    const listSearch = (location.state as InvoiceListLocationState | null)?.listSearch;
    return listSearch ? `/invoices?${listSearch}` : '/invoices';
  }, [location.state]);

  const headerBreadcrumb = useMemo(() => {
    if (detailLoading) return null;
    if (!invoice) {
      return [
        { label: 'Billing' },
        { label: 'Invoices', onClick: () => navigate(invoicesBackUrl) },
        { label: 'Not Found' },
      ];
    }
    return [
      { label: 'Billing' },
      { label: 'Invoices', onClick: () => navigate(invoicesBackUrl) },
      { label: invoice.iv_no },
    ];
  }, [detailLoading, invoice, invoicesBackUrl, navigate]);

  usePageBreadcrumb(headerBreadcrumb);

  useEffect(() => {
    if (!id) return;
    fetchInvoiceDetail(id);
    fetchTransactions(id);
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
      <DetailContainer title="Invoice Not Found">
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
            <Button variant="outline" onClick={() => navigate(invoicesBackUrl)}>
              Back to Invoices
            </Button>
          </EmptyContent>
        </Empty>
      </DetailContainer>
    );
  }

  const handleUpdateStatus = async () => {
    if (!id) return;
    const success = await markAsPaid(id);
    if (success) fetchInvoiceDetail(id);
  };

  const handleCancelInvoice = async () => {
    if (!id) return;
    const success = await cancelInvoice(id);
    if (success) fetchInvoiceDetail(id);
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
      title: 'Mark as PAID',
      content: `Mark invoice #${invoice.iv_no} as PAID?`,
      okText: 'Mark as PAID',
      onOk: handleUpdateStatus,
    });
  };

  const promptCancelInvoice = () => {
    if (!invoice || !id) return;
    confirmInvoiceAction({
      title: 'Cancel Invoice',
      content: `Cancel invoice #${invoice.iv_no}?`,
      okText: 'Cancel Invoice',
      danger: true,
      onOk: handleCancelInvoice,
    });
  };

  const handleExportPDF = () => {
    const blob = buildInvoicePdf(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.pdf`);
    message.success('PDF exported successfully!');
  };

  const handleExportExcel = () => {
    const blob = buildInvoiceXlsx(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.xlsx`);
    message.success('Excel exported successfully!');
  };

  const isReady = invoice.status === 'READY';
  const amount = invoice.amount ?? 0;
  const canCancel = ['READY', 'PENDING', 'MISSING_FEE', 'ERROR'].includes(invoice.status);

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
    { label: 'Invoice No', value: invoice.iv_no },
    { label: 'Billing Month', value: invoice.billing_month || '-' },
    { label: 'Created Date', value: formatDate(invoice.cr_date) },
    { label: 'Bill To', value: invoice.branch_name || '-' },
    {
      label: 'Due Date',
      value: (
        <span className={isReady ? 'font-semibold text-destructive' : undefined}>
          {formatDate(invoice.due_date)}
        </span>
      ),
    },
    ...(invoice.status === 'PAID' && invoice.upd_date
      ? [
          {
            label: 'Paid Date',
            value: (
              <span className="font-semibold text-success">{formatDate(invoice.upd_date)}</span>
            ),
          },
        ]
      : []),
  ];

  const showActions = canExport || (canWrite && (isReady || canCancel));

  return (
    <DetailContainer
      title={`Invoice Details: #${invoice.iv_no}`}
      status={
        <StatusBadge status={invoice.status} variant={statusTagColor(invoice.status)} />
      }
      extra={
        showActions ? (
          <div className="no-print flex flex-wrap items-center gap-2">
            {canExport ? (
              <>
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileText data-icon="inline-start" aria-hidden="true" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet data-icon="inline-start" aria-hidden="true" />
                  Export Excel
                </Button>
              </>
            ) : null}
            {canWrite && isReady ? (
              <LoadingButton onClick={promptUpdateStatus} loading={updatingStatus}>
                <CheckCircle data-icon="inline-start" aria-hidden="true" />
                Mark as PAID
              </LoadingButton>
            ) : null}
            {canWrite && canCancel ? (
              <LoadingButton
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
      maxWidth={900}
    >
      <div className="flex justify-center">
        <Card className="w-full max-w-[900px] shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl font-bold tracking-widest text-primary">
              INVOICE
            </CardTitle>
            <CardDescription>Zero Platform</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-6">
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
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t">
            <Separator />
            <div className="flex w-full justify-end">
              <div className="flex w-full max-w-xs items-center justify-between">
                <span className="font-semibold">Total Amount</span>
                <span
                  className={`text-xl font-bold tabular-nums ${amount < 0 ? 'text-destructive' : 'text-success'}`}
                >
                  {formatMoney(amount)}
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DetailContainer>
  );
};

export default InvoiceDetail;
