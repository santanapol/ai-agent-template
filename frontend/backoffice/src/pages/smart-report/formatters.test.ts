import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatScheduleLabel,
  formatValidationStatusLabel,
  scheduleToUiValue,
  validationStatusColor,
} from './formatters';

describe('smartReport/formatters', () => {
  it('formats validation status labels', () => {
    expect(formatValidationStatusLabel('valid')).toBe('Validated');
    expect(formatValidationStatusLabel(undefined)).toBe('Not validated');
  });

  it('maps validation status colors', () => {
    expect(validationStatusColor('valid')).toBe('success');
    expect(validationStatusColor('invalid')).toBe('error');
  });

  it('formats daily schedule label', () => {
    expect(
      formatScheduleLabel({
        frequency: 'daily',
        hour: 9,
        minute: 30,
        timezone: 'Asia/Bangkok',
      }),
    ).toBe('Daily (Every day at 09:30)');
  });

  it('formats monthly last-day schedule label', () => {
    expect(
      formatScheduleLabel({
        frequency: 'monthly',
        dayOfMonth: 'last',
        hour: 0,
        minute: 0,
        timezone: 'Asia/Bangkok',
      }),
    ).toBe('Monthly (Last day of the month at 00:00)');
  });

  it('maps schedule to UI value', () => {
    expect(scheduleToUiValue(null)).toBe('manual');
    expect(
      scheduleToUiValue({
        frequency: 'weekly',
        dayOfWeek: 1,
        hour: 0,
        minute: 0,
        timezone: 'Asia/Bangkok',
      }),
    ).toBe('weekly');
  });

  it('formats ISO datetime for display', () => {
    expect(formatDateTime('2026-06-30T12:48:53.000Z')).toMatch(/^2026-06-30 /);
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('invalid')).toBe('—');
  });
});
