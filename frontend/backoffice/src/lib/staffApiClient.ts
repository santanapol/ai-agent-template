import axios, { type AxiosResponse } from 'axios';
import type {
  ApiEnvelope,
  StaffProfile,
  CreateProfilePayload,
  PatchProfilePayload,
  ResetProfilePasswordPayload,
  ListProfilesParams,
} from '../types/staff';

let _accessToken: string | null = null;
let _refreshCallback: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function setRefreshCallback(fn: () => Promise<string | null>): void {
  _refreshCallback = fn;
}

const client = axios.create();

client.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// On 401, attempt one token refresh then retry the original request
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

export async function listProfiles(params: ListProfilesParams = {}) {
  const res = await client.get<ApiEnvelope<StaffProfile[]>>('/api/v1/staff/profiles', { params });
  return res.data;
}

export async function getProfileById(id: string): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.get<ApiEnvelope<StaffProfile>>(`/api/v1/staff/profiles/${id}`);
  return { profile: res.data.data, etag: extractETag(res) };
}

export async function getProfileByUserId(
  userId: string,
): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.get<ApiEnvelope<StaffProfile[]>>(
    '/api/v1/staff/profiles',
    { params: { user_id: userId } },
  );
  const profile = res.data.data[0];
  if (!profile) throw new Error('Profile not found');
  return { profile, etag: extractETag(res) };
}

export async function createProfile(payload: CreateProfilePayload): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>('/api/v1/staff/profiles', payload);
  return res.data.data;
}

export async function patchProfile(
  id: string,
  payload: PatchProfilePayload,
  etag: string,
): Promise<{ profile: StaffProfile; etag: string | null }> {
  const res = await client.patch<ApiEnvelope<StaffProfile>>(
    `/api/v1/staff/profiles/${id}`,
    payload,
    { headers: { 'Content-Type': 'application/merge-patch+json', 'If-Match': etag } },
  );
  return { profile: res.data.data, etag: extractETag(res) };
}

export async function archiveProfile(id: string, etag: string): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>(
    `/api/v1/staff/profiles/${id}/archive`,
    {},
    { headers: { 'If-Match': etag } },
  );
  return res.data.data;
}

export async function restoreProfile(id: string, etag: string): Promise<StaffProfile> {
  const res = await client.post<ApiEnvelope<StaffProfile>>(
    `/api/v1/staff/profiles/${id}/restore`,
    {},
    { headers: { 'If-Match': etag } },
  );
  return res.data.data;
}

export async function resetProfilePassword(
  id: string,
  payload: ResetProfilePasswordPayload,
): Promise<void> {
  await client.post(`/api/v1/staff/profiles/${id}/password`, payload);
}
