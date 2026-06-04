import test from 'node:test';
import assert from 'node:assert';
import buildApp from '../../../app.js';

test('Master Data API - Game Companies and Categories', async (t) => {
  const app = await buildApp();
  
  t.after(async () => {
    await app.close();
  });

  await t.test('GET /api/v1/agent-invoice/master-data/game-companies should return list of game companies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-companies',
      headers: {
        'x-gateway-secret': process.env.GATEWAY_SECRET || 'WSgEKTV8ci7UguW6qRDPsMJNBnI4l7lU'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
    assert.ok(Array.isArray(body.data));
  });

  await t.test('GET /api/v1/agent-invoice/master-data/game-categories should return list of game categories', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agent-invoice/master-data/game-categories',
      headers: {
        'x-gateway-secret': process.env.GATEWAY_SECRET || 'WSgEKTV8ci7UguW6qRDPsMJNBnI4l7lU'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
    assert.ok(Array.isArray(body.data));
  });
});
