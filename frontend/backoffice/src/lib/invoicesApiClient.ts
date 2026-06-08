import axios from 'axios';
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

let _accessToken: string | null = null;
let _refreshCallback: (() => Promise<string | null>) | null = null;

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as typeof err.config & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry && _refreshCallback) {
      original._retry = true;
      const newToken = await _refreshCallback();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
    }
    return Promise.reject(err);
  },
);

export function setInvoicesAccessToken(token: string | null): void {
  _accessToken = token;
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export function setInvoicesRefreshCallback(fn: (() => Promise<string | null>) | null): void {
  _refreshCallback = fn;
}

export async function listInvoices(params: ListInvoicesParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<ListInvoicesData>>('/api/v1/invoices', { params, signal });
  return res.data;
}

export async function listInvoiceAgents(signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<InvoiceAgentBranch[]>>('/api/v1/invoices/agent', { signal });
  return res.data;
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
