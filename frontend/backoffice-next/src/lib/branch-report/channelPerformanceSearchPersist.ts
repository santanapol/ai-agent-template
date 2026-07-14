import dayjs from "dayjs";

import type { Royalty21SearchValues } from "@/components/branch-report/marketing/Royalty21SearchForm";
import type { Royalty21QueryParams } from "@/types/branchReport";

const STORAGE_KEY = "zero:channel-performance:last-search";

type PersistedPayload = {
  values: {
    channelType: Royalty21SearchValues["channelType"];
    inviteLinkId?: string;
    referralUsername?: string;
    regDateFrom: string;
    regDateTo: string;
  };
  params: Royalty21QueryParams;
};

export function persistChannelPerformanceSearch(
  values: Royalty21SearchValues,
  params: Royalty21QueryParams,
): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: PersistedPayload = {
    values: {
      channelType: values.channelType,
      inviteLinkId: values.inviteLinkId,
      referralUsername: values.referralUsername,
      regDateFrom: values.regDateRange[0].format("YYYY-MM-DD"),
      regDateTo: values.regDateRange[1].format("YYYY-MM-DD"),
    },
    params,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readPersistedChannelPerformanceSearch(): {
  values: Royalty21SearchValues;
  params: Royalty21QueryParams;
} | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPayload;
    return {
      values: {
        channelType: parsed.values.channelType,
        inviteLinkId: parsed.values.inviteLinkId,
        referralUsername: parsed.values.referralUsername,
        regDateRange: [dayjs(parsed.values.regDateFrom), dayjs(parsed.values.regDateTo)],
      },
      params: parsed.params,
    };
  } catch {
    return null;
  }
}

export function clearPersistedChannelPerformanceSearch(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Drop branch-scoped invite link after branch switch; keep exact username for member_referral. */
export function paramsForBranchSwitchRefetch(params: Royalty21QueryParams): Royalty21QueryParams {
  if (params.channelType === "direct") {
    return { ...params, page: 1 };
  }
  if (params.channelType === "member_referral") {
    return {
      channelType: "member_referral",
      referralUsername: params.referralUsername,
      regDateFrom: params.regDateFrom,
      regDateTo: params.regDateTo,
      page: 1,
      pageSize: params.pageSize,
    };
  }
  return {
    channelType: params.channelType,
    regDateFrom: params.regDateFrom,
    regDateTo: params.regDateTo,
    page: 1,
    pageSize: params.pageSize,
  };
}
