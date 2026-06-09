import type { ApiEnvelope } from '../types/agents';
import type {
  GenerateInvoicesData,
  GenerateInvoicesPayload,
  Invoice,
  InvoiceAgentBranch,
  InvoiceTransaction,
  ListInvoicesData,
  ListInvoicesParams,
} from '../types/invoice';
import { baseClient as client } from './baseApiClient';

export async function listInvoices(params: ListInvoicesParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<ListInvoicesData>>('/api/v1/invoices', { params, signal });
  return res.data;
}

let _agentsPromise: Promise<ApiEnvelope<InvoiceAgentBranch[]>> | null = null;

export function listInvoiceAgents(signal?: AbortSignal) {
  if (!_agentsPromise) {
    _agentsPromise = client
      .get<ApiEnvelope<InvoiceAgentBranch[]>>('/api/v1/invoices/agent', { signal })
      .then((res) => res.data)
      .catch((err) => {
        _agentsPromise = null;
        throw err;
      });
  }
  return _agentsPromise;
}

export async function getInvoiceById(id: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<Invoice>>(`/api/v1/invoices/${id}`, { signal });
  return res.data;
}

export async function listInvoiceTransactions(id: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<InvoiceTransaction[]>>(
    `/api/v1/invoices/${id}/transactions`,
    { signal },
  );
  return res.data;
}

export async function generateInvoices(payload: GenerateInvoicesPayload) {
  const res = await client.post<ApiEnvelope<GenerateInvoicesData>>('/api/v1/invoices/generate', payload);
  return res.data;
}

export async function updateInvoiceStatus(id: string, status: 'PAID') {
  const res = await client.put<ApiEnvelope<Invoice>>(`/api/v1/invoices/${id}/status`, { status });
  return res.data;
}
