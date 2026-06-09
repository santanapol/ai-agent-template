import test from 'node:test';
import assert from 'node:assert';
import { calculateFee } from '../calculate-fee.service.js';

test('calculateFee — returns PRECONDITION_REQUIRED when ifMatch is absent', async () => {
  const result = await calculateFee({
    ivId: '665a3d76b1e5f8b9e6f2b3d1',
    action: 'CALCULATE',
    ifMatch: null,
    actor: 'user1',
    ouId: '000000000000000000000456',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, 'PRECONDITION_REQUIRED');
});

test('calculateFee — returns INVALID_PARAM for unknown action', async () => {
  const result = await calculateFee({
    ivId: '665a3d76b1e5f8b9e6f2b3d1',
    action: 'UNKNOWN',
    ifMatch: 'W/"dGVzdA=="',
    actor: 'user1',
    ouId: '000000000000000000000456',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, 'INVALID_PARAM');
});

test('calculateFee — logs error and returns INTERNAL_ERROR when an unexpected exception is thrown', async () => {
  const errors = [];
  const log = { error: (data, msg) => errors.push({ data, msg }) };

  // 'not-a-valid-objectid' causes new ObjectId() to throw a BSONError inside the repo
  // before any DB call, so no live DB is needed
  const result = await calculateFee({
    ivId: 'not-a-valid-objectid',
    action: 'CALCULATE',
    ifMatch: 'W/"dGVzdA=="',
    actor: 'user1',
    ouId: '000000000000000000000456',
    log,
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, 'INTERNAL_ERROR');
  assert.strictEqual(errors.length, 1, 'log.error must be called exactly once');
  assert.strictEqual(errors[0].data.ivId, 'not-a-valid-objectid', 'log must include the invoice id');
  assert.strictEqual(typeof errors[0].data.errName, 'string', 'log must include errName as a string');
  assert.ok(!('err' in errors[0].data), 'raw err object must not appear in the log payload');
});
