import { useCallback, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { apiErrorMessage } from "@/lib/apiError";
import * as api from "@/lib/invoicesApiClient";
import type {
  GenerateInvoicesPayload,
  Invoice,
  InvoiceAgentBranch,
  InvoiceTransaction,
  ListInvoicesParams,
  PartialFailureData,
} from "@/types/invoice";

import { buildInvoiceEtag } from "../bulk/invoiceEtag";

let invoiceAgentsInflight: Promise<InvoiceAgentBranch[]> | null = null;

/** @internal Test helper — resets module-level in-flight dedupe state. */
export function __resetInvoiceAgentsInflightForTests() {
  invoiceAgentsInflight = null;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
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
    if (invoiceAgentsInflight) {
      return invoiceAgentsInflight;
    }

    setLoadingBranches(true);
    invoiceAgentsInflight = (async () => {
      try {
        const res = await api.listInvoiceAgents();
        const items = Array.isArray(res.data) ? res.data : [];
        setBranches(items);
        return items;
      } catch (error: unknown) {
        toast.error(apiErrorMessage(error, "Failed to fetch branches"));
        return [];
      } finally {
        setLoadingBranches(false);
        invoiceAgentsInflight = null;
      }
    })();

    return invoiceAgentsInflight;
  }, []);

  const fetchInvoices = useCallback(async (params: ListInvoicesParams = {}, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await api.listInvoices(params, signal);
      if (signal?.aborted) return;
      const items = res.data?.items ?? [];
      const pagination = res.data?.pagination;
      setInvoices(items);
      setTotal(pagination?.total ?? items.length);
    } catch (error: unknown) {
      if (signal?.aborted) return;
      toast.error(apiErrorMessage(error, "Failed to fetch invoices"));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const generateInvoices = useCallback(async (payload: GenerateInvoicesPayload) => {
    setGenerating(true);
    try {
      const res = await api.generateInvoices(payload);
      const count = res.data?.generated_count ?? 0;
      toast.success(`Generated ${count} invoice(s) successfully`);
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data?.code === "PARTIAL_FAILURE") {
        const partial = error.response.data.data as PartialFailureData | null;
        const generated = partial?.generated_count ?? 0;
        const failed = partial?.error_invoice_ids?.length ?? 0;
        toast.warning(`Partial failure: ${generated} invoice(s) generated, ${failed} failed fee calculation`);
        return true;
      }
      toast.error(apiErrorMessage(error, "Failed to generate invoices"));
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
      toast.error(apiErrorMessage(error, "Failed to fetch invoice"));
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
      toast.error(apiErrorMessage(error, "Failed to fetch transactions"));
      return [];
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (id: string, nextStatus: "PAID" | "VOID", successMsg: string, errorMsg: string) => {
      setUpdatingStatus(true);
      try {
        let currentInvoice = invoice?._id === id ? invoice : null;
        if (!currentInvoice) {
          const detailRes = await api.getInvoiceById(id);
          currentInvoice = detailRes.data;
        }
        const etag = buildInvoiceEtag(currentInvoice?.upd_date);
        const res = await api.updateInvoiceStatus(id, nextStatus, etag);
        setInvoice(res.data);
        toast.success(successMsg);
        return true;
      } catch (error: unknown) {
        toast.error(apiErrorMessage(error, errorMsg));
        return false;
      } finally {
        setUpdatingStatus(false);
      }
    },
    [invoice],
  );

  const markAsPaid = useCallback(
    (id: string) => updateStatus(id, "PAID", "Invoice marked as PAID", "Failed to update invoice status"),
    [updateStatus],
  );

  const cancelInvoice = useCallback(
    (id: string) => updateStatus(id, "VOID", "Invoice cancelled successfully", "Failed to cancel invoice"),
    [updateStatus],
  );

  return {
    invoices,
    total,
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
