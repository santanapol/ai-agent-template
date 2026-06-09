import type { ApiEnvelope } from '../types/agents';
import type { AgentFee, GameCompany, GameCategory, ListFeesParams, CreateFeePayload, UpdateFeePayload } from '../types/agentFees';
import { baseClient as client, extractETag } from './baseApiClient';

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
