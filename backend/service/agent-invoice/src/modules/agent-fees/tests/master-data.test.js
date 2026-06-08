import test from 'node:test';
import assert from 'node:assert';
import buildApp from '../../../app.js';

test('Master Data API - Game Companies and Categories', async (t) => {
  const app = await buildApp();
  const validHeaders = {
    'x-gateway-secret': process.env.GATEWAY_SECRET || 'change-me',
    'x-user-ou': '665a3d76b1e5f8b9e6f2b9b1',
    'x-user-branch': '665a3d76b1e5f8b9e6f2b9c1',
    'x-user-id': 'test_master_data_user',
    'x-user-role': 'admin'
  };

  t.after(async () => {
    await app.close();
  });

  await t.test('GET /game-companies should return list of game companies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-companies',
      headers: validHeaders
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
    assert.ok(Array.isArray(body.data));
  });

  await t.test('GET /game-categories should return list of game categories', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-categories',
      headers: validHeaders
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
    assert.ok(Array.isArray(body.data));
  });

  await t.test('GET /game-companies — 400 INVALID_PARAM when ou_id is not a valid ObjectId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-companies?ou_id=not-a-valid-objectid',
      headers: validHeaders
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'INVALID_PARAM');
  });

  await t.test('GET /game-categories — 400 INVALID_PARAM when ou_id is not a valid ObjectId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-categories?ou_id=not-a-valid-objectid',
      headers: validHeaders
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'INVALID_PARAM');
  });
});
