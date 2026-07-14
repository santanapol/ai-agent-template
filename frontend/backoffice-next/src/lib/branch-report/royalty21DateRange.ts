import dayjs, { type Dayjs } from "dayjs";

/** Inclusive register-date span allowed by the API (see royalty-21-times.md). */
export const MAX_REG_DATE_RANGE_DAYS = 366;

export function currentMonthRegRange(): { regDateFrom: Dayjs; regDateTo: Dayjs } {
  return {
    regDateFrom: dayjs().startOf("month"),
    regDateTo: dayjs().endOf("month"),
  };
}

export function formatRegDateParam(value: Dayjs): string {
  return value.format("YYYY-MM-DD");
}

/** Inclusive day count between two calendar dates. */
export function regDateRangeInclusiveDays(from: Dayjs, to: Dayjs): number {
  return to.diff(from, "day") + 1;
}

/** True when `to` is unset or on/after `from` (calendar day). */
export function isRegDateRangeValid(from: Dayjs | undefined, to: Dayjs | undefined): boolean {
  if (!from || !to) return true;
  return !to.isBefore(from, "day");
}

export function isRegDateRangeWithinMaxDays(from: Dayjs, to: Dayjs, maxDays = MAX_REG_DATE_RANGE_DAYS): boolean {
  if (!isRegDateRangeValid(from, to)) return false;
  return regDateRangeInclusiveDays(from, to) <= maxDays;
}

/** RangePicker disabledDate — caps span while the second date is being chosen. */
export function createRegDateRangeDisabledDate(maxDays = MAX_REG_DATE_RANGE_DAYS) {
  const maxOffset = maxDays - 1;
  return (current: Dayjs, info: { from?: Dayjs }) => {
    if (!current || !info.from) return false;
    if (current.isBefore(info.from, "day")) return true;
    return current.diff(info.from, "day") > maxOffset;
  };
}

export const regDateRangePresets = () => [
  {
    label: "This month",
    value: [dayjs().startOf("month"), dayjs().endOf("month")] as [Dayjs, Dayjs],
  },
  {
    label: "Last month",
    value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] as [
      Dayjs,
      Dayjs,
    ],
  },
];

export function toRoyalty21QueryParams(input: {
  channelType: "affiliate_link" | "member_referral" | "direct";
  inviteLinkId?: string;
  referralUsername?: string;
  regDateRange: [Dayjs, Dayjs];
  page: number;
  pageSize: number;
}) {
  const [regDateFrom, regDateTo] = input.regDateRange;
  return {
    channelType: input.channelType,
    inviteLinkId: input.channelType === "affiliate_link" ? input.inviteLinkId : undefined,
    referralUsername: input.channelType === "member_referral" ? input.referralUsername : undefined,
    regDateFrom: formatRegDateParam(regDateFrom),
    regDateTo: formatRegDateParam(regDateTo),
    page: input.page,
    pageSize: input.pageSize,
  };
}

export function getRoyalty21DefaultSearchValues() {
  const { regDateFrom, regDateTo } = currentMonthRegRange();
  return {
    channelType: "affiliate_link" as const,
    regDateRange: [regDateFrom, regDateTo] as [Dayjs, Dayjs],
  };
}
