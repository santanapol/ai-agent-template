export type ChannelType = "affiliate_link" | "member_referral" | "direct";

export interface InviteLinkItem {
  id: string;
  inviteCode: string;
  username: string;
  description: string;
}

/** 21 lifetime deposit amounts in chronological order (bill_date ASC). */
export type Royalty21Deposits = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Royalty21Row {
  username: string;
  /** DD/MM/YYYY UTC calendar date */
  register: string;
  billin: number;
  withdraw: number;
  promotion: number;
  revenue: number;
  deposits: Royalty21Deposits;
}

export interface BranchReportPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface BranchReportEnvelope<T> {
  success: boolean;
  code: string;
  message: string | null;
  data: T;
  pagination?: BranchReportPagination;
  requestId?: string;
}

export interface Royalty21QueryParams {
  channelType: ChannelType;
  inviteLinkId?: string;
  regDateFrom: string;
  regDateTo: string;
  page?: number;
  pageSize?: number;
}
