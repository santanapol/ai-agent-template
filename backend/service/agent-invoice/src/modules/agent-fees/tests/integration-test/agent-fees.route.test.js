import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import buildApp from '../../../../app.js';

describe('Agent Fees API Integration Tests', () => {
  let app;
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  let createdFeeId;

  before(async () => {
    app = await buildApp({ logger: false });
    // Clean up before starting
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_TEST_INTEGRATION' });
  });

  after(async () => {
    // Clean up after all tests
    if (app && app.db) {
      await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_TEST_INTEGRATION' });
    }
    if (app) {
      await app.close();
    }
  });

  test('GET /api/v1/agents/:agentId/fees - should return array of fees', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/agents/${agentId}/fees`
    });
    
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.statusCode, 200);
    assert.ok(Array.isArray(body.data));
  });

  test('POST /api/v1/agents/:agentId/fees - should create a new fee', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_TEST_INTEGRATION',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 10
      }
    });
    
    assert.strictEqual(res.statusCode, 201);
    const body = res.json();
    assert.ok(body.data.insertedId);
    createdFeeId = body.data.insertedId;
  });

  test('POST /api/v1/agents/:agentId/fees - should return 409 Conflict for duplicate fee', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      payload: {
        company_id: 'PG_TEST_INTEGRATION', // same as above
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 15
      }
    });
    
    assert.strictEqual(res.statusCode, 409);
  });

  test('PATCH /api/v1/agents/:agentId/fees/:feeId - should update fee with valid upd_date', async () => {
    // 1. Get the current upd_date
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/agents/${agentId}/fees`
    });
    const fees = getRes.json().data;
    const feeToUpdate = fees.find(f => f._id === createdFeeId);
    
    assert.ok(feeToUpdate);

    // 2. Perform patch
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      payload: {
        fee_rate: 12.5,
        upd_date: feeToUpdate.upd_date
      }
    });

    assert.strictEqual(patchRes.statusCode, 200);
  });

  test('PATCH /api/v1/agents/:agentId/fees/:feeId - should return 409 for optimistic lock failure', async () => {
    // Sending old date deliberately
    const oldDate = new Date('2020-01-01T00:00:00.000Z').toISOString();
    
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      payload: {
        fee_rate: 20,
        upd_date: oldDate
      }
    });

    assert.strictEqual(patchRes.statusCode, 409);
  });

  test('DELETE /api/v1/agents/:agentId/fees/:feeId - should delete the fee', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`
    });
    
    assert.strictEqual(res.statusCode, 204);
  });

  test('DELETE /api/v1/agents/:agentId/fees/:feeId - should return 404 for already deleted fee', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`
    });
    
    assert.strictEqual(res.statusCode, 404);
  });
});
