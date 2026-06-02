import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import buildApp from '../../../../app.js';

describe('Agent Fees API Integration Tests', () => {
  let app;
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  const mockUserId = 'test_admin_user';
  let createdFeeId;
  let currentEtag;

  before(async () => {
    app = await buildApp({ logger: false });
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_TEST_INTEGRATION' });
  });

  after(async () => {
    if (app && app.db) {
      await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_TEST_INTEGRATION' });
    }
    if (app) {
      await app.close();
    }
  });

  test('GET /api/v1/agents/:agentId/fees - should return array of fees with pagination meta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/agents/${agentId}/fees?page=1&limit=10`
    });
    
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.statusCode, 200);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.meta.page, 1);
    assert.strictEqual(body.meta.limit, 10);
    assert.ok(typeof body.meta.total === 'number');
  });

  test('POST /api/v1/agents/:agentId/fees - should create a new fee and return ETag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      headers: {
        'x-user-id': mockUserId
      },
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

    currentEtag = res.headers['etag'];
    assert.ok(currentEtag);
    assert.ok(currentEtag.startsWith('W/"'));
  });

  test('POST /api/v1/agents/:agentId/fees - should return 409 Conflict for duplicate fee', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agentId}/fees`,
      headers: {
        'x-user-id': mockUserId
      },
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

  test('PATCH /api/v1/agents/:agentId/fees/:feeId - should return 428 if If-Match is missing', async () => {
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      headers: {
        'x-user-id': mockUserId
      },
      payload: {
        fee_rate: 12.5
      }
    });

    assert.strictEqual(patchRes.statusCode, 428);
  });

  test('PATCH /api/v1/agents/:agentId/fees/:feeId - should update fee with valid If-Match', async () => {
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      headers: {
        'x-user-id': mockUserId,
        'if-match': currentEtag
      },
      payload: {
        fee_rate: 12.5
      }
    });

    assert.strictEqual(patchRes.statusCode, 200);
    // update currentEtag for next tests
    currentEtag = patchRes.headers['etag'];
    assert.ok(currentEtag);
  });

  test('PATCH /api/v1/agents/:agentId/fees/:feeId - should return 412 for optimistic lock failure', async () => {
    // Sending old ETag deliberately
    const oldDate = new Date('2020-01-01T00:00:00.000Z').toISOString();
    const oldEtag = `W/"${Buffer.from(oldDate).toString('base64')}"`;
    
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      headers: {
        'x-user-id': mockUserId,
        'if-match': oldEtag
      },
      payload: {
        fee_rate: 20
      }
    });

    assert.strictEqual(patchRes.statusCode, 412);
  });

  test('DELETE /api/v1/agents/:agentId/fees/:feeId - should delete the fee', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agents/${agentId}/fees/${createdFeeId}`,
      headers: {
        'x-user-id': mockUserId
      }
    });
    
    assert.strictEqual(res.statusCode, 204);
  });
});
