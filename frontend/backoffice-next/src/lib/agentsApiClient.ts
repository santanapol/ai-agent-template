import type { Agent, ApiEnvelope, ListAgentsParams, UpdateAgentPayload } from "../types/agents";
import { baseClient as client, extractETag } from "./baseApiClient";

export async function listAgents(params: ListAgentsParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<Agent[]>>("/api/v1/agent-invoice/agents", { params, signal });
  return {
    data: res.data.data,
    total: res.data.pagination?.total || 0,
  };
}

export async function listUnsyncedBranches(includeInactive = false) {
  const query = includeInactive ? "?includeInactive=true" : "";
  const res = await client.get<
    ApiEnvelope<{ branch_id: string; branch_code: string; branch_name: string; active: boolean }[]>
  >(`/api/v1/agent-invoice/agents/unsynced${query}`);
  return res.data;
}

export async function getAgentById(id: string, signal?: AbortSignal): Promise<{ agent: Agent; etag: string | null }> {
  const res = await client.get<ApiEnvelope<Agent>>(`/api/v1/agent-invoice/agents/${id}`, { signal });
  return { agent: res.data.data, etag: extractETag(res) };
}

export async function syncAgent(branchId: string): Promise<unknown> {
  const res = await client.post<ApiEnvelope<unknown>>("/api/v1/agent-invoice/agents/sync", { branch_id: branchId });
  return res.data;
}

export async function updateAgent(
  id: string,
  payload: UpdateAgentPayload,
  dateISO: string,
): Promise<{ etag: string | null }> {
  const etag = `W/"${btoa(dateISO)}"`;
  const res = await client.put<ApiEnvelope<null>>(`/api/v1/agent-invoice/agents/${id}`, payload, {
    headers: { "If-Match": etag },
  });
  return { etag: extractETag(res) };
}

export async function softDeleteAgent(id: string, dateISO: string): Promise<void> {
  const etag = `W/"${btoa(dateISO)}"`;
  await client.delete(`/api/v1/agent-invoice/agents/${id}`, {
    headers: { "If-Match": etag },
  });
}
