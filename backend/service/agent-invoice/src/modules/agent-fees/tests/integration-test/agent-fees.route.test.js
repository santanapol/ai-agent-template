import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import buildApp from "../../../../app.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import { ObjectId } from "mongodb";

describe("Agent Fees API Integration Tests", () => {
  let app;
  const agentId = "665a3d76b1e5f8b9e6f2b1a1";
  const ouId = "665a3d76b1e5f8b9e6f2b1b1";
  const branchId = "665a3d76b1e5f8b9e6f2b1c1";
  const mockUserId = "test_admin_user";
  let createdFeeId;
  let currentEtag;

  const baseHeaders = buildMeshHeaders({
    ouId,
    branchId,
    userId: mockUserId,
    role: "platform_admin",
    permissions: "agents:fees,agents:*",
  });

  before(async () => {
    app = await buildApp({ logger: false });
    await app.db.collection("agents").insertOne({
      _id: new ObjectId(agentId),
      ou_id: new ObjectId(ouId),
      branch_id: new ObjectId(branchId),
      active: true,
    });
    await app.db.collection("agent_fees").deleteMany({
      cr_by: mockUserId,
    });
  });

  after(async () => {
    if (app && app.db) {
      await app.db
        .collection("agents")
        .deleteOne({ _id: new ObjectId(agentId) });
      await app.db.collection("agent_fees").deleteMany({
        cr_by: mockUserId,
      });
    }
    if (app) await app.close();
  });

  test("GET /api/v1/agent-invoice/agents/:agentId/fees — returns success envelope with pagination", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees?page=1&limit=10`,
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.limit, 10);
    assert.ok(typeof body.pagination.total === "number");
  });

  test("POST /api/v1/agent-invoice/agents/:agentId/fees — creates fee, returns CREATED envelope + ETag", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        game_company_id: "000000000000000000000001",
        game_main_cate_id: "000000000000000000000002",
        gcomp_cost: 8,
        agent_known_fee: 10,
        agent_fee: 10,
      },
    });

    assert.strictEqual(res.statusCode, 201);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "CREATED");
    assert.ok(body.data.insertedId);
    createdFeeId = body.data.insertedId;

    currentEtag = res.headers["etag"];
    assert.ok(currentEtag);
    assert.ok(currentEtag.startsWith('W/"'));
  });

  test("POST /api/v1/agent-invoice/agents/:agentId/fees — 409 DUPLICATE for duplicate fee", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        game_company_id: "000000000000000000000001",
        game_main_cate_id: "000000000000000000000002",
        agent_known_fee: 15,
        agent_fee: 15,
      },
    });

    assert.strictEqual(res.statusCode, 409);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "DUPLICATE");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 428 PRECONDITION_REQUIRED if If-Match missing", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: baseHeaders,
      payload: { agent_known_fee: 12.5 },
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "PRECONDITION_REQUIRED");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — updates fee with valid If-Match", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, "if-match": currentEtag },
      payload: { agent_known_fee: 12.5 },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");

    currentEtag = res.headers["etag"];
    assert.ok(currentEtag);
  });

  test("PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 412 VERSION_CONFLICT for stale ETag", async () => {
    const oldDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
    const oldEtag = `W/"${Buffer.from(oldDate).toString("base64")}"`;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, "if-match": oldEtag },
      payload: { agent_known_fee: 20 },
    });

    assert.strictEqual(res.statusCode, 412);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "VERSION_CONFLICT");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 428 PRECONDITION_REQUIRED if If-Match missing", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "PRECONDITION_REQUIRED");
  });

  test("DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId — 412 VERSION_CONFLICT for stale ETag", async () => {
    const oldDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
    const staleEtag = `W/"${Buffer.from(oldDate).toString("base64")}"`;

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, "if-match": staleEtag },
    });

    assert.strictEqual(res.statusCode, 412);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "VERSION_CONFLICT");
  });

  test("DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId — deletes fee with valid If-Match", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees/${createdFeeId}`,
      headers: { ...baseHeaders, "if-match": currentEtag },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");
  });

  test("Request without x-gateway-secret — returns 401 GATEWAY_SECRET_REJECTED", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: { "x-user-id": mockUserId },
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "GATEWAY_SECRET_REJECTED");
  });

  test("POST — 400 INVALID_PARAM when game_company_id is not a valid ObjectId", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        game_company_id: "not-a-valid-objectid",
        game_main_cate_id: "000000000000000000000002",
        agent_known_fee: 10,
        agent_fee: 10,
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "INVALID_PARAM");
  });

  test("POST — 400 INVALID_PARAM when game_main_cate_id is not a valid ObjectId", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        game_company_id: "000000000000000000000001",
        game_main_cate_id: "not-a-valid-objectid",
        agent_known_fee: 10,
        agent_fee: 10,
      },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "INVALID_PARAM");
  });

  test("Tenant isolation — fees created under one ou/branch are not visible from another", async () => {
    const otherHeaders = {
      ...baseHeaders,
      "x-user-ou": "665a3d76b1e5f8b9e6f2b1d1",
      "x-user-branch": "665a3d76b1e5f8b9e6f2b1e1",
    };

    // Create a fee under the original tenant
    const createRes = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {
        game_company_id: "000000000000000000000001",
        game_main_cate_id: "000000000000000000000003",
        agent_known_fee: 5,
        agent_fee: 5,
      },
    });
    assert.strictEqual(createRes.statusCode, 201);

    // GET from a different tenant — should fail because the agent doesn't belong to this OU
    const listRes = await app.inject({
      method: "GET",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: otherHeaders,
    });
    assert.strictEqual(listRes.statusCode, 404);

    // Cleanup
    // Handled by after() hook
  });
});
