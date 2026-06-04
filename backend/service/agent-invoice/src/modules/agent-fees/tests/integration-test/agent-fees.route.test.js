import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import buildApp from '../../../../app.js';

describe('Agent Fees API Integration Tests', () => {
  let app;
  const agentId = '665a3d76b1e5f8b9e6f2b1a1';
  const ouId = '665a3d76b1e5f8b9e6f2b1b1';
  const branchId = '665a3d76b1e5f8b9e6f2b1c1';
  const mockUserId = 'test_admin_user';
  let createdFeeId;
  let currentEtag;

  const baseHeaders = {
    'x-gateway-secret': process.env.GATEWAY_SECRET || 'change-me',
    'x-user-ou': ouId,
    'x-user-branch': branchId,
    'x-user-id': mockUserId,
    'x-user-role': 'admin'
  };

  before(async () => {
    app = await buildApp({ logger: false });
    await app.db.collection('agent_category_fees').deleteMany({
      company_id: 'PG_TEST_INTEGRATION'
    });
  });

  after(async () => {
    if (app && app.db) {
      await app.db.collection('agent_category_fees').deleteMany({
        company_id: 'PG_TEST_INTEGRATION'
      });
    }
    if (app) await app.close();
  });

  test('GET /api/v1/agent-invoice/agents/:agentId/fees — returns success envelope with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees?page=1&limit=10`,
      headers: baseHeaders
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 10);
    assert.ok(typeof body.pagination.total === 'number');
  });

  test('POST /api/v1/agent-invoice/agents/:agentId/fees — creates fee, returns CREATED envelope + ETag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
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
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'CREATED');
    assert.ok(body.data.insertedId);
    createdFeeId = body.data.insertedId;

    currentEtag = res.headers['etag'];
    assert.ok(currentEtag);
    assert.ok(currentEtag.startsWith('W/"'));
  });

  test('POST /api/v1/agent-invoice/agents/:agentId/fees — 409 DUPLICATE for duplicate fee', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        company_id: 'PG_TEST_INTEGRATION',
        main_cate_id: 'SLOT',
        platform_name: 'TEST_PLATFORM',
        game_provider: 'PG Soft',
        game_category: 'Slot',
        fee_rate: 15
      }
    });

    assert.strictEqual(res.statusCode, 409);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'DUPLICATE');
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test('PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 428 PRECONDITION_REQUIRED if If-Match missing', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: baseHeaders,
      payload: { fee_rate: 12.5 }
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'PRECONDITION_REQUIRED');
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test('PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — updates fee with valid If-Match', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, 'if-match': currentEtag },
      payload: { fee_rate: 12.5 }
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');

    currentEtag = res.headers['etag'];
    assert.ok(currentEtag);
  });

  test('PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 412 VERSION_CONFLICT for stale ETag', async () => {
    const oldDate = new Date('2020-01-01T00:00:00.000Z').toISOString();
    const oldEtag = `W/"${Buffer.from(oldDate).toString('base64')}"`;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, 'if-match': oldEtag },
      payload: { fee_rate: 20 }
    });

    assert.strictEqual(res.statusCode, 412);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'VERSION_CONFLICT');
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test('DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 428 PRECONDITION_REQUIRED if If-Match missing', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: baseHeaders
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'PRECONDITION_REQUIRED');
  });

  test('DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId — deletes fee with valid If-Match', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, 'if-match': currentEtag }
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, 'SUCCESS');
  });

  test('Request without x-gateway-secret — returns 401 GATEWAY_SECRET_REJECTED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: { 'x-user-id': mockUserId }
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'GATEWAY_SECRET_REJECTED');
  });

  test('Tenant isolation — fees created under one ou/branch are not visible from another', async () => {
    const otherHeaders = {
      ...baseHeaders,
      'x-user-ou': '665a3d76b1e5f8b9e6f2b1d1',
      'x-user-branch': '665a3d76b1e5f8b9e6f2b1e1'
    };

    // Create a fee under the original tenant
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        company_id: 'PG_TENANT_ISOLATION_TEST',
        main_cate_id: 'POKER',
        fee_rate: 5
      }
    });
    assert.strictEqual(createRes.statusCode, 201);

    // GET from a different tenant — should not see the fee
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: otherHeaders
    });
    assert.strictEqual(listRes.statusCode, 200);
    const body = listRes.json();
    const found = body.data.find((f) => f.company_id === 'PG_TENANT_ISOLATION_TEST');
    assert.strictEqual(found, undefined, 'Fee should not be visible from another tenant');

    // Cleanup
    await app.db.collection('agent_category_fees').deleteMany({ company_id: 'PG_TENANT_ISOLATION_TEST' });
  });
});
