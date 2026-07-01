import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Info,
  XCircle,
} from 'lucide-react';
import { DetailContainer } from '@/components/layout';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { LoadingButton } from '@/components/loading-button';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useInvoices } from './hooks/useInvoices';
import {
  formatCategoryName,
  formatDate,
  formatFee,
  formatMoney,
  sortInvoiceTransactions,
  statusTagColor,
} from './utils';
import type { InvoiceTransaction } from '@/types/invoice';
import { buildInvoicePdf } from './export/buildInvoicePdf';
import { buildInvoiceXlsx } from './export/buildInvoiceXlsx';
import { triggerBlobDownload } from './export/downloadBlob';

const InvoiceDetail: React.FC = () => {
  const { message } = useAppFeedback();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    return <Skeleton className="h-96 w-full rounded-xl" aria-busy="true" />;
  }

  if (!invoice) {
    return (
      <DetailContainer title="Invoice Not Found" backUrl="/invoices">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-lg font-semibold">Invoice Not Found</p>
            <Button variant="outline" onClick={() => navigate('/invoices')}>
              Back to Invoices
            </Button>
          </CardContent>
        </Card>
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

  const columns: DataTableColumn<InvoiceTransaction>[] = [
    {
      key: 'company_name',
      title: 'Game Provider',
      render: (record) => record.company_name || '-',
    },
    {
      key: 'main_category_name',
      title: 'Game Category',
      render: (record) => formatCategoryName(record.main_category_name),
    },
    {
      key: 'bet',
      title: 'Bet',
      align: 'right',
      render: (record) => formatMoney(record.bet || 0),
    },
    {
      key: 'net_win',
      title: 'Net Win',
      align: 'right',
      render: (record) => formatMoney(record.net_win),
    },
    {
      key: 'fee',
      title: (
        <span className="inline-flex items-center gap-1">
          Fee (%)
          <Tooltip>
            <TooltipTrigger render={<button type="button" className="inline-flex" aria-label="Fee info" />}>
              <Info className="size-3.5 text-primary" />
            </TooltipTrigger>
            <TooltipContent>Fee is calculated based on Net Win</TooltipContent>
          </Tooltip>
        </span>
      ),
      align: 'right',
      render: (record) => formatFee(record.fee),
    },
    {
      key: 'amount',
      title: 'Amount',
      align: 'right',
      render: (record) => formatMoney(record.amount),
    },
  ];

  const summaryFooter = (
    <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalBet)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalNetWin)}</TableCell>
      <TableCell />
      <TableCell className="text-right tabular-nums">{formatMoney(totals.totalAmount)}</TableCell>
    </TableRow>
  );

  return (
    <DetailContainer
      title="Invoice Details"
      backUrl="/invoices"
      extra={
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText data-icon="inline-start" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet data-icon="inline-start" />
            Export Excel
          </Button>
          {isReady ? (
            <LoadingButton onClick={() => void handleUpdateStatus()} loading={updatingStatus}>
              <CheckCircle data-icon="inline-start" />
              Mark as PAID
            </LoadingButton>
          ) : null}
          {['READY', 'PENDING', 'MISSING_FEE', 'ERROR'].includes(invoice.status) ? (
            <LoadingButton
              variant="destructive"
              onClick={() => void handleCancelInvoice()}
              loading={updatingStatus}
            >
              <XCircle data-icon="inline-start" />
              Cancel Invoice
            </LoadingButton>
          ) : null}
        </div>
      }
      maxWidth={900}
    >
      <div className="flex justify-center">
        <Card className="w-full max-w-[900px] shadow-sm">
          <CardContent className="p-10 md:p-12">
            <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-widest text-primary">INVOICE</h2>
                <p className="text-muted-foreground">Zero Platform</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-muted-foreground">#{invoice.iv_no}</p>
                <StatusBadge
                  status={invoice.status}
                  variant={statusTagColor(invoice.status)}
                />
              </div>
            </div>

            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Billing Month: </span>
                  <span className="font-medium">{invoice.billing_month || '-'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Created Date: </span>
                  <span className="font-medium">{formatDate(invoice.cr_date)}</span>
                </p>
              </div>
              <div className="space-y-2 text-right text-sm sm:text-right">
                <p>
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground">BILL TO </span>
                  <span className="text-base font-semibold">{invoice.branch_name || '-'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Due Date: </span>
                  <span className={isReady ? 'font-semibold text-destructive' : 'font-medium text-muted-foreground'}>
                    {formatDate(invoice.due_date)}
                  </span>
                </p>
                {invoice.status === 'PAID' && invoice.upd_date ? (
                  <p>
                    <span className="text-muted-foreground">Paid Date: </span>
                    <span className="font-semibold text-green-600">{formatDate(invoice.upd_date)}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <Separator className="my-6" />

            <DataTable
              columns={columns}
              data={sortedTransactions}
              loading={transactionsLoading}
              rowKey="_id"
              pageSize={sortedTransactions.length || 100}
              footer={summaryFooter}
            />

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">Total Amount</span>
                  <span className={`text-xl font-bold ${amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatMoney(amount)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DetailContainer>
  );
};

export default InvoiceDetail;
