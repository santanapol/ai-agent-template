import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';
import { db } from '../config/database.js';

describe('Commission API - Fastify Integration Test', () => {
  let app;

  before(async () => {
    app = await buildApp();
    await db.connectToTestDB();
  });

  after(async () => {
    await db.clearCollections();
    await app.close();
  });

  test('POST /api/commission - should create record and return 201', async () => {
    // 1. จำลองการยิง Request ผ่าน fastify.inject (ไม่กิน Port ภายนอก)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commission',
      payload: { amount: 1000, rate: 0.05, userId: 'user-123' }
    });

    // 2. ตรวจสอบ API Boundary
    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.data.payoutAmount, 50);

    // 3. ตรวจสอบ Database Integration Boundary
    const savedRecord = await db.collection('commissions').findOne({ userId: 'user-123' });
    assert.ok(savedRecord, 'Record must exist in Database');
    assert.strictEqual(savedRecord.amount, 1000);
  });
});
