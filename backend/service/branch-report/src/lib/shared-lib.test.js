import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEPOSIT_SUCCESS_STATUS,
  WITHDRAW_SUCCESS_STATUS,
} from './constants.js';
import { formatRegisterDate } from './format-register.js';
import { sendError, sendSuccess } from './response.js';

function createMockReply() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('constants', () => {
  it('exports deposit success status codes', () => {
    assert.deepEqual(DEPOSIT_SUCCESS_STATUS, [
      '001',
      '002',
      '004',
      '006',
      '007',
      '008',
      '009',
      '010',
    ]);
  });

  it('exports withdraw success status', () => {
    assert.equal(WITHDRAW_SUCCESS_STATUS, '200');
  });
});

describe('formatRegisterDate', () => {
  it('formats UTC date as DD/MM/YYYY with zero-padding', () => {
    const result = formatRegisterDate(new Date('2024-06-15T10:30:00Z'));
    assert.equal(result, '15/06/2024');
  });

  it('zero-pads single-digit day and month', () => {
    const result = formatRegisterDate(new Date('2024-01-05T23:59:59Z'));
    assert.equal(result, '05/01/2024');
  });

  it('accepts ISO date strings', () => {
    assert.equal(formatRegisterDate('2024-06-15T10:30:00Z'), '15/06/2024');
  });

  it('returns dash for invalid dates', () => {
    assert.equal(formatRegisterDate('not-a-date'), '-');
  });
});

describe('response envelope helpers', () => {
  it('sendSuccess returns SUCCESS envelope with data and requestId', () => {
    const reply = createMockReply();

    sendSuccess(reply, {
      data: [{ username: 'user1' }],
      requestId: 'req-1',
    });

    assert.equal(reply.statusCode, 200);
    assert.deepEqual(reply.body, {
      success: true,
      code: 'SUCCESS',
      message: null,
      data: [{ username: 'user1' }],
      requestId: 'req-1',
    });
  });

  it('sendSuccess includes pagination when provided', () => {
    const reply = createMockReply();
    const pagination = { page: 1, pageSize: 50, total: 100 };

    sendSuccess(reply, {
      data: [],
      pagination,
      requestId: 'req-2',
    });

    assert.deepEqual(reply.body.pagination, pagination);
  });

  it('sendError returns error envelope with data null', () => {
    const reply = createMockReply();

    sendError(reply, {
      statusCode: 400,
      code: 'INVALID_PARAM',
      message: 'page must be >= 1',
      requestId: 'req-3',
    });

    assert.equal(reply.statusCode, 400);
    assert.deepEqual(reply.body, {
      success: false,
      code: 'INVALID_PARAM',
      message: 'page must be >= 1',
      data: null,
      requestId: 'req-3',
    });
  });
});
