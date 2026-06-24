import { useState, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';
import * as api from '../../../lib/invoicesApiClient';
import { apiErrorMessage } from '../../../lib/apiError';
import { buildInvoiceEtag } from '../bulk/invoiceEtag';
import type {
  GenerateInvoicesPayload,
  Invoice,
  InvoiceAgentBranch,
  InvoiceTransaction,
  ListInvoicesParams,
  PartialFailureData,
} from '../../../types/invoice';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<InvoiceTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [branches, setBranches] = useState<InvoiceAgentBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const fetchInvoiceAgents = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await api.listInvoiceAgents();
      const items = Array.isArray(res.data) ? res.data : [];
      setBranches(items);
      return items;
    } catch (error: unknown) {
      message.error(apiErrorMessage(error, 'Failed to fetch branches'));
      return [];
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const fetchInvoices = useCallback(async (params: ListInvoicesParams = {}) => {
    setLoading(true);
    try {
      const res = await api.listInvoices(params);
      const items = res.data?.items ?? [];
      const pagination = res.data?.pagination;
      setInvoices(items);
      setTotal(pagination?.total ?? items.length);
      if (pagination?.page) setPage(pagination.page);
      if (pagination?.limit) setLimit(pagination.limit);
    } catch (error: unknown) {
      message.error(apiErrorMessage(error, 'Failed to fetch invoices'));
    } finally {
      setLoading(false);
    }
  }, []);

  const generateInvoices = useCallback(async (payload: GenerateInvoicesPayload) => {
    setGenerating(true);
    try {
      const res = await api.generateInvoices(payload);
      const count = res.data?.generated_count ?? 0;
      message.success(res.message || `Generated ${count} invoice(s) successfully`);
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data?.code === 'PARTIAL_FAILURE') {
        const partial = error.response.data.data as PartialFailureData | null;
        const generated = partial?.generated_count ?? 0;
        const failed = partial?.error_invoice_ids?.length ?? 0;
        message.warning(
          `Partial failure: ${generated} invoice(s) generated, ${failed} failed fee calculation`,
        );
        return true;
      }
      message.error(apiErrorMessage(error, 'Failed to generate invoices'));
      return false;
    } finally {
      setGenerating(false);
    }
  }, []);

  const fetchInvoiceDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setInvoice(null);
    try {
      const res = await api.getInvoiceById(id);
      setInvoice(res.data);
      return res.data;
    } catch (error: unknown) {
      message.error({ content: apiErrorMessage(error, 'Failed to fetch invoice'), key: `fetch-invoice-detail-${id}` });
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (id: string) => {
    setTransactionsLoading(true);
    setTransactions([]);
    try {
      const res = await api.listInvoiceTransactions(id);
      const items = Array.isArray(res.data) ? res.data : [];
      setTransactions(items);
      return items;
    } catch (error: unknown) {
      message.error({ content: apiErrorMessage(error, 'Failed to fetch transactions'), key: `fetch-invoice-transactions-${id}` });
      return [];
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, nextStatus: 'PAID' | 'VOID', successMsg: string, errorMsg: string) => {
    setUpdatingStatus(true);
    try {
      const etag = buildInvoiceEtag(invoice?.upd_date);
      const res = await api.updateInvoiceStatus(id, nextStatus, etag);
      setInvoice(res.data);
      message.success(successMsg);
      return true;
    } catch (error: unknown) {
      message.error(apiErrorMessage(error, errorMsg));
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  }, [invoice]);

  const markAsPaid = useCallback((id: string) =>
    updateStatus(id, 'PAID', 'Invoice marked as PAID', 'Failed to update invoice status'),
    [updateStatus]
  );

  const cancelInvoice = useCallback((id: string) =>
    updateStatus(id, 'VOID', 'Invoice cancelled successfully', 'Failed to cancel invoice'),
    [updateStatus]
  );

  return {
    invoices,
    total,
    page,
    limit,
    loading,
    generating,
    invoice,
    transactions,
    detailLoading,
    transactionsLoading,
    updatingStatus,
    branches,
    loadingBranches,
    fetchInvoiceAgents,
    fetchInvoices,
    generateInvoices,
    fetchInvoiceDetail,
    fetchTransactions,
    markAsPaid,
    cancelInvoice,
  };
}
