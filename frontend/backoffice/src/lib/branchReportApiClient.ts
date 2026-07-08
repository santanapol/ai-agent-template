import type {
  BranchReportEnvelope,
  BranchReportPagination,
  InviteLinkItem,
  Royalty21QueryParams,
  Royalty21Row,
} from '../types/branchReport';
import { baseClient as client } from './baseApiClient';

const BASE_PATH = '/api/v1/branch-report';

export class BranchReportApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BranchReportApiError';
    this.code = code;
  }
}

function unwrapEnvelope<T>(envelope: BranchReportEnvelope<T>): T {
  if (!envelope.success) {
    throw new BranchReportApiError(
      envelope.code,
      envelope.message ?? 'Request failed',
    );
  }
  return envelope.data;
}

export async function getInviteLinks(signal?: AbortSignal): Promise<InviteLinkItem[]> {
  const res = await client.get<BranchReportEnvelope<InviteLinkItem[]>>(`${BASE_PATH}/invite-links`, {
    signal,
  });
  return unwrapEnvelope(res.data);
}

export async function getRoyalty21Times(
  params: Royalty21QueryParams,
  signal?: AbortSignal,
): Promise<{ data: Royalty21Row[]; pagination: BranchReportPagination }> {
  const res = await client.get<
    BranchReportEnvelope<Royalty21Row[]> & { pagination: BranchReportPagination }
  >(`${BASE_PATH}/royalty-21-times`, { params, signal });

  if (!res.data.success) {
    throw new BranchReportApiError(
      res.data.code,
      res.data.message ?? 'Request failed',
    );
  }

  if (!res.data.pagination) {
    throw new BranchReportApiError('INVALID_RESPONSE', 'Missing pagination in report response');
  }

  return { data: res.data.data, pagination: res.data.pagination };
}
