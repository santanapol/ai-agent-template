import axios, { type AxiosResponse } from 'axios';
import type { Agent, ApiEnvelope, ListAgentsParams, UpdateAgentPayload } from '../types/agents';

let _accessToken: string | null = null;
let _refreshCallback: (() => Promise<string | null>) | null = null;

export function setAgentAccessToken(token: string | null): void {
  _accessToken = token;
}

export function setAgentRefreshCallback(fn: () => Promise<string | null>): void {
  _refreshCallback = fn;
}

const client = axios.create();

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

function extractETag(res: AxiosResponse): string | null {
  const raw = res.headers['etag'];
  return typeof raw === 'string' ? raw : null;
}

export async function listAgents(params: ListAgentsParams = {}) {
  const res = await client.get<ApiEnvelope<Agent[]>>('/api/v1/agent-invoice/agents', { params });
  return {
    data: res.data.data,
    total: res.data.pagination?.total || 0,
  };
}

export async function listUnsyncedBranches(includeInactive = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  const res = await client.get<ApiEnvelope<{ branch_id: string; branch_code: string; branch_name: string; active: boolean }[]>>(`/api/v1/agent-invoice/agents/unsynced${query}`);
  return res.data;
}

export async function getAgentById(id: string): Promise<{ agent: Agent; etag: string | null }> {
  const res = await client.get<ApiEnvelope<Agent>>(`/api/v1/agent-invoice/agents/${id}`);
  return { agent: res.data.data, etag: extractETag(res) };
}

export async function syncAgent(branchId: string): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>('/api/v1/agent-invoice/agents/sync', { branch_id: branchId });
  return res.data;
}

export async function updateAgent(
  id: string,
  payload: UpdateAgentPayload,
  dateISO: string,
): Promise<{ agent: Agent; etag: string | null }> {
  const etag = `W/"${btoa(dateISO)}"`;
  const res = await client.put<ApiEnvelope<Agent>>(
    `/api/v1/agent-invoice/agents/${id}`,
    payload,
    { headers: { 'If-Match': etag } },
  );
  return { agent: res.data.data, etag: extractETag(res) };
}

export async function softDeleteAgent(id: string, dateISO: string): Promise<void> {
  const etag = `W/"${btoa(dateISO)}"`;
  await client.delete(`/api/v1/agent-invoice/agents/${id}`, {
    headers: { 'If-Match': etag },
  });
}
