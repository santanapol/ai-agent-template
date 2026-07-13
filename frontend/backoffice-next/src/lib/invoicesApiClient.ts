import type { ApiEnvelope } from "../types/agents";
import type {
  BatchInvoicesData,
  GenerateInvoicesData,
  GenerateInvoicesPayload,
  Invoice,
  InvoiceAgentBranch,
  InvoiceTransaction,
  ListInvoicesData,
  ListInvoicesParams,
} from "../types/invoice";
import { baseClient as client } from "./baseApiClient";

export async function listInvoices(params: ListInvoicesParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<ListInvoicesData>>("/api/v1/invoices", { params, signal });
  return res.data;
}

export async function listInvoiceAgents(signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<InvoiceAgentBranch[]>>("/api/v1/invoices/agent", {
    signal,
  });
  return res.data;
}

export async function getInvoiceById(id: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<Invoice>>(`/api/v1/invoices/${id}`, { signal });
  return res.data;
}

export async function getInvoicesBatch(
  ids: string[],
  options: { includeTransactions?: boolean } = {},
  signal?: AbortSignal,
) {
  const params: Record<string, string> = {
    ids: ids.join(","),
  };
  if (options.includeTransactions) {
    params.include = "transactions";
  }
  const res = await client.get<ApiEnvelope<BatchInvoicesData>>("/api/v1/invoices/batch", {
    params,
    signal,
  });
  return res.data;
}

export async function listInvoiceTransactions(id: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<InvoiceTransaction[]>>(`/api/v1/invoices/${id}/transactions`, { signal });
  return res.data;
}

export async function generateInvoices(payload: GenerateInvoicesPayload) {
  const res = await client.post<ApiEnvelope<GenerateInvoicesData>>("/api/v1/invoices/generate", payload);
  return res.data;
}

export async function updateInvoiceStatus(id: string, status: "PAID" | "VOID", etag?: string) {
  const headers = etag ? { "If-Match": etag } : undefined;
  const res = await client.put<ApiEnvelope<Invoice>>(`/api/v1/invoices/${id}/status`, { status }, { headers });
  return res.data;
}
