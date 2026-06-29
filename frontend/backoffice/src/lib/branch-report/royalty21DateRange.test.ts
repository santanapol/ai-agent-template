import { describe, expect, it, vi, afterEach } from 'vitest';
import dayjs from 'dayjs';
import {
  currentMonthRegRange,
  formatRegDateParam,
  getRoyalty21DefaultSearchValues,
  isRegDateRangeValid,
  toRoyalty21QueryParams,
} from './royalty21DateRange';

describe('royalty21DateRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('currentMonthRegRange returns local month boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));

    const range = currentMonthRegRange();
    expect(range.regDateFrom.format('YYYY-MM-DD')).toBe('2024-06-01');
    expect(range.regDateTo.format('YYYY-MM-DD')).toBe('2024-06-30');
  });

  it('formatRegDateParam serializes as YYYY-MM-DD', () => {
    expect(formatRegDateParam(dayjs('2024-06-15'))).toBe('2024-06-15');
  });

  it('getRoyalty21DefaultSearchValues includes affiliate default channel', () => {
    const defaults = getRoyalty21DefaultSearchValues();
    expect(defaults.channelType).toBe('affiliate_link');
    expect(defaults.regDateFrom).toBeDefined();
    expect(defaults.regDateTo).toBeDefined();
  });

  it('isRegDateRangeValid rejects inverted range', () => {
    expect(isRegDateRangeValid(dayjs('2024-06-01'), dayjs('2024-05-01'))).toBe(false);
    expect(isRegDateRangeValid(dayjs('2024-06-01'), dayjs('2024-06-01'))).toBe(true);
  });

  it('toRoyalty21QueryParams omits inviteLinkId for non-affiliate channels', () => {
    expect(
      toRoyalty21QueryParams({
        channelType: 'member_referral',
        inviteLinkId: 'ignored',
        regDateFrom: dayjs('2024-06-01'),
        regDateTo: dayjs('2024-06-30'),
        page: 1,
        pageSize: 50,
      }),
    ).toEqual({
      channelType: 'member_referral',
      regDateFrom: '2024-06-01',
      regDateTo: '2024-06-30',
      page: 1,
      pageSize: 50,
    });
  });
});
