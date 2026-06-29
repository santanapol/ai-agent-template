import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  currentMonthDateStringsUtc,
  parseRegDateRange,
} from './reg-date-range.js';

describe('parseRegDateRange', () => {
  it('returns inclusive UTC day bounds', () => {
    const { reg_date } = parseRegDateRange('2024-06-01', '2024-06-30');

    assert.equal(reg_date.$gte.toISOString(), '2024-06-01T00:00:00.000Z');
    assert.equal(reg_date.$lte.toISOString(), '2024-06-30T23:59:59.999Z');
  });

  it('rejects missing params', () => {
    assert.throws(
      () => parseRegDateRange(undefined, '2024-06-30'),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_PARAM');
        return true;
      },
    );
  });

  it('rejects invalid date strings', () => {
    assert.throws(
      () => parseRegDateRange('2024-13-01', '2024-06-30'),
      (error) => error.code === 'INVALID_PARAM',
    );
    assert.throws(
      () => parseRegDateRange('2024-02-30', '2024-06-30'),
      (error) => error.code === 'INVALID_PARAM',
    );
  });

  it('rejects inverted range', () => {
    assert.throws(
      () => parseRegDateRange('2024-06-30', '2024-06-01'),
      (error) => {
        assert.match(error.message, /regDateFrom/i);
        return true;
      },
    );
  });

  it('rejects range wider than MAX_REG_DATE_RANGE_DAYS', () => {
    assert.throws(
      () => parseRegDateRange('2024-01-01', '2025-01-01'),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_PARAM');
        assert.match(error.message, /366/);
        return true;
      },
    );
  });

  it('accepts range exactly MAX_REG_DATE_RANGE_DAYS inclusive', () => {
    const { reg_date } = parseRegDateRange('2024-01-01', '2024-12-31');
    assert.equal(reg_date.$gte.toISOString(), '2024-01-01T00:00:00.000Z');
    assert.equal(reg_date.$lte.toISOString(), '2024-12-31T23:59:59.999Z');
  });
});

describe('currentMonthDateStringsUtc', () => {
  it('returns first and last day of reference month', () => {
    const range = currentMonthDateStringsUtc(new Date('2024-06-15T12:00:00Z'));
    assert.deepEqual(range, {
      regDateFrom: '2024-06-01',
      regDateTo: '2024-06-30',
    });
  });
});
