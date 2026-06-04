import axios from 'axios';
import type { ApiEnvelope } from '../types/agents';
import type { AgentFee, GameCompany, GameCategory, ListFeesParams, CreateFeePayload, UpdateFeePayload } from '../types/agentFees';

// Reuse the axios instance from agentsApiClient if possible, or create a new one pointing to same base
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAgentFeesAccessToken(token: string | null): void {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

function extractETag(response: any): string | null {
  return response.headers['etag'] || response.headers['Etag'] || response.headers['ETag'] || null;
}

export async function listAgentFees(agentId: string, params: ListFeesParams = {}) {
  const res = await client.get<ApiEnvelope<AgentFee[]>>(`/api/v1/agent-invoice/agents/${agentId}/fees`, { params });
  return {
    data: res.data.data,
    total: res.data.pagination?.total || 0,
  };
}

export async function createAgentFee(agentId: string, payload: CreateFeePayload) {
  const res = await client.post<ApiEnvelope<unknown>>(`/api/v1/agent-invoice/agents/${agentId}/fees`, payload);
  return { data: res.data.data, etag: extractETag(res) };
}

export async function updateAgentFee(agentId: string, feeId: string, payload: UpdateFeePayload, etag: string) {
  const formattedEtag = etag.startsWith('W/"') ? etag : `W/"${etag}"`;
  const res = await client.patch<ApiEnvelope<unknown>>(`/api/v1/agent-invoice/agents/${agentId}/fees/${feeId}`, payload, {
    headers: { 'If-Match': formattedEtag },
  });
  return { data: res.data.data, etag: extractETag(res) };
}

export async function deleteAgentFee(agentId: string, feeId: string, etag: string) {
  const formattedEtag = etag.startsWith('W/"') ? etag : `W/"${etag}"`;
  await client.delete(`/api/v1/agent-invoice/agents/${agentId}/fees/${feeId}`, {
    headers: { 'If-Match': formattedEtag },
  });
}

export async function getGameCompanies() {
  const res = await client.get<ApiEnvelope<GameCompany[]>>('/api/v1/agent-invoice/master-data/game-companies');
  return res.data.data;
}

export async function getGameCategories() {
  const res = await client.get<ApiEnvelope<GameCategory[]>>('/api/v1/agent-invoice/master-data/game-categories');
  return res.data.data;
}
