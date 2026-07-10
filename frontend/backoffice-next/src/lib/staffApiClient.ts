import type {
  ApiEnvelope,
  CreateProfilePayload,
  ListProfilesParams,
  PatchProfilePayload,
  ResetProfilePasswordPayload,
  StaffProfile,
} from "../types/staff";
import { baseClient as client, extractETag } from "./baseApiClient";

export async function listProfiles(params: ListProfilesParams = {}, signal?: AbortSignal) {
  const res = await client.get<ApiEnvelope<StaffProfile[]>>("/api/v1/staff/profiles", { params, signal });
  return res.data;
}

export async function getProfileCounts(params: { status: "active" | "archived"; branch_id?: string }) {
  const res = await client.get<ApiEnvelope<{ total: number }>>("/api/v1/staff/profiles/count", { params });
  return res.data.data;
}

export async function getProfileById(id: string): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.get<ApiEnvelope<StaffProfile>>(`/api/v1/staff/profiles/${id}`);
  return { profile: res.data.data, etag: extractETag(res) };
}

export async function getProfileByUserId(userId: string): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.get<ApiEnvelope<StaffProfile>>("/api/v1/staff/profiles", { params: { user_id: userId } });
  const profile = res.data.data;
  if (!profile) throw new Error("Profile not found");
  return { profile, etag: extractETag(res) };
}

export async function createProfile(payload: CreateProfilePayload): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>("/api/v1/staff/profiles", payload);
  return res.data.data;
}

export async function patchProfile(
  id: string,
  payload: PatchProfilePayload,
  etag: string,
): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.patch<ApiEnvelope<StaffProfile>>(`/api/v1/staff/profiles/${id}`, payload, {
    headers: { "Content-Type": "application/merge-patch+json", "If-Match": etag },
  });
  return { profile: res.data.data, etag: extractETag(res) };
}

export async function archiveProfile(id: string, etag: string): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>(
    `/api/v1/staff/profiles/${id}/archive`,
    {},
    { headers: { "If-Match": etag } },
  );
  return res.data.data;
}

export async function restoreProfile(id: string, etag: string): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>(
    `/api/v1/staff/profiles/${id}/restore`,
    {},
    { headers: { "If-Match": etag } },
  );
  return res.data.data;
}

export async function resetProfilePassword(id: string, payload: ResetProfilePasswordPayload): Promise<void> {
  await client.post(`/api/v1/staff/profiles/${id}/password`, payload);
}

export async function changeProfileRole(id: string, role: string): Promise<void> {
  await client.patch(`/api/v1/staff/profiles/${id}/role`, { role });
}
