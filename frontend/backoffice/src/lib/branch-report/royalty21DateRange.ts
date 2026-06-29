import dayjs, { type Dayjs } from 'dayjs';

export function currentMonthRegRange(): { regDateFrom: Dayjs; regDateTo: Dayjs } {
  return {
    regDateFrom: dayjs().startOf('month'),
    regDateTo: dayjs().endOf('month'),
  };
}

export function formatRegDateParam(value: Dayjs): string {
  return value.format('YYYY-MM-DD');
}

/** True when `to` is unset or on/after `from` (calendar day). */
export function isRegDateRangeValid(
  from: Dayjs | undefined,
  to: Dayjs | undefined,
): boolean {
  if (!from || !to) return true;
  return !to.isBefore(from, 'day');
}

export function toRoyalty21QueryParams(input: {
  channelType: 'affiliate_link' | 'member_referral' | 'direct';
  inviteLinkId?: string;
  regDateFrom: Dayjs;
  regDateTo: Dayjs;
  page: number;
  pageSize: number;
}) {
  return {
    channelType: input.channelType,
    inviteLinkId:
      input.channelType === 'affiliate_link' ? input.inviteLinkId : undefined,
    regDateFrom: formatRegDateParam(input.regDateFrom),
    regDateTo: formatRegDateParam(input.regDateTo),
    page: input.page,
    pageSize: input.pageSize,
  };
}

export function getRoyalty21DefaultSearchValues() {
  return {
    channelType: 'affiliate_link' as const,
    ...currentMonthRegRange(),
  };
}
