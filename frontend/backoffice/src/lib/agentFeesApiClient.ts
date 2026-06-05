import axios from 'axios';
import type { ApiEnvelope } from '../types/agents';
import type { AgentFee, GameCompany, GameCategory, ListFeesParams, CreateFeePayload, UpdateFeePayload } from '../types/agentFees';

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

export function setAgentFeesAccessToken(token: string | null): void {
  _accessToken = token;
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export function setAgentFeesRefreshCallback(fn: (() => Promise<string | null>) | null): void {
  _refreshCallback = fn;
}

function extractETag(response: any): string | null {
  return response.headers['etag'] || response.headers['Etag'] || response.headers['ETag'] || null;
}

export async function listAgentFees(agentId: string, params: ListFeesParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<AgentFee[]>>(`/api/v1/agent-invoice/agents/${agentId}/fees`, { params, signal });
  return {
    data: res.data.data,
    total: res.data.pagination?.total || 0,
  };
}

export async function createAgentFee(agentId: string, payload: CreateFeePayload) {
  const res = await client.post<ApiEnvelope<unknown>>(`/api/v1/agent-invoice/agents/${agentId}/fees`, payload);
  return { data: res.data.data, etag: extractETag(res) };
}

export async function updateAgentFee(agentId: string, feeId: string, payload: UpdateFeePayload, dateISO: string) {
  const etag = `W/"${btoa(dateISO)}"`;
  const res = await client.patch<ApiEnvelope<unknown>>(`/api/v1/agent-invoice/agents/${agentId}/fees/${feeId}`, payload, {
    headers: { 'If-Match': etag },
  });
  return { data: res.data.data, etag: extractETag(res) };
}

export async function deleteAgentFee(agentId: string, feeId: string, dateISO: string) {
  const etag = `W/"${btoa(dateISO)}"`;
  await client.delete(`/api/v1/agent-invoice/agents/${agentId}/fees/${feeId}`, {
    headers: { 'If-Match': etag },
  });
}

export async function getGameCompanies(ou_id?: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<GameCompany[]>>('/api/v1/agent-invoice/master-data/game-companies', { params: { ou_id }, signal });
  return res.data.data;
}

export async function getGameCategories(ou_id?: string, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<GameCategory[]>>('/api/v1/agent-invoice/master-data/game-categories', { params: { ou_id }, signal });
  return res.data.data;
}
