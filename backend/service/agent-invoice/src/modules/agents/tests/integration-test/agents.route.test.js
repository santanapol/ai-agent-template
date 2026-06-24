import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";
import buildApp from "../../../../app.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";

describe("Agents API Integration Tests", () => {
  let app;
  const ouId = "665a3d76b1e5f8b9e6f2b3b1";
  const mockUserId = "test_agents_route_user";
  let createdAgentId;
  let currentEtag;

  const baseHeaders = buildMeshHeaders({
    ouId,
    branchId: "665a3d76b1e5f8b9e6f2b3c1",
    userId: mockUserId,
    role: "admin",
  });

  const validPayload = {
    branch_id: "665a3d76b1e5f8b9e6f2b3d1",
    branch_code: "ROUTETEST01",
    branch_name: "Route Test Agent",
    branch_type: "AG",
    currency: "THB",
    default_fee_rate: 10,
  };

  async function cleanupAgents() {
    await app.db.collection("agents").deleteMany({
      $or: [
        { cr_by: mockUserId },
        { branch_code: validPayload.branch_code },
        { branch_id: new ObjectId(validPayload.branch_id) },
      ],
    });
  }

  before(async () => {
    app = await buildApp({ logger: false });
    await cleanupAgents();
  });

  after(async () => {
    if (app && app.db) {
      await cleanupAgents();
    }
    if (app) await app.close();
  });

  test("GET /api/v1/agent-invoice/agents — returns success envelope with pagination", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents?page=1&limit=10",
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

  test("POST /api/v1/agent-invoice/agents — 400 INVALID_PARAM when required fields are missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/agent-invoice/agents",
      headers: baseHeaders,
      payload: { branch_name: "Missing required fields" },
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "INVALID_PARAM");
    assert.strictEqual(body.data, null);
  });

  test("POST /api/v1/agent-invoice/agents — creates agent, returns 201 CREATED envelope with ETag", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/agent-invoice/agents",
      headers: baseHeaders,
      payload: validPayload,
    });

    assert.strictEqual(res.statusCode, 201);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "CREATED");
    assert.ok(body.data.insertedId, "response data should contain insertedId");
    createdAgentId = body.data.insertedId;

    currentEtag = res.headers["etag"];
    assert.ok(currentEtag, "ETag header should be present after create");
    assert.ok(currentEtag.startsWith('W/"'), "ETag should be a weak ETag");
  });

  test("GET /api/v1/agent-invoice/agents/:id — returns agent detail with ETag header", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");
    assert.ok(body.data, "data should be present");
    assert.strictEqual(body.data.branch_code, validPayload.branch_code);
    assert.strictEqual(body.data.branch_name, validPayload.branch_name);

    currentEtag = res.headers["etag"];
    assert.ok(currentEtag, "ETag header should be present on GET detail");
    assert.ok(currentEtag.startsWith('W/"'));
  });

  test("GET /api/v1/agent-invoice/agents/:id — 404 RESOURCE_NOT_FOUND for non-existent agent", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents/000000000000000000000001",
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "RESOURCE_NOT_FOUND");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("PUT /api/v1/agent-invoice/agents/:id — 428 PRECONDITION_REQUIRED when If-Match header is absent", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: baseHeaders,
      payload: { branch_name: "Updated Name" },
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "PRECONDITION_REQUIRED");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("PUT /api/v1/agent-invoice/agents/:id — 412 VERSION_CONFLICT for stale ETag", async () => {
    const staleDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
    const staleEtag = `W/"${Buffer.from(staleDate).toString("base64")}"`;

    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: { ...baseHeaders, "if-match": staleEtag },
      payload: { branch_name: "Should Not Update" },
    });

    assert.strictEqual(res.statusCode, 412);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "VERSION_CONFLICT");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("PUT /api/v1/agent-invoice/agents/:id — updates agent with valid If-Match, returns new ETag", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: { ...baseHeaders, "if-match": currentEtag },
      payload: { branch_name: "Updated Agent Name", default_fee_rate: 15 },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");

    const newEtag = res.headers["etag"];
    assert.ok(newEtag, "new ETag should be present after update");
    assert.notStrictEqual(
      newEtag,
      currentEtag,
      "ETag should change after update",
    );
    currentEtag = newEtag;
  });

  test("DELETE /api/v1/agent-invoice/agents/:id — 428 PRECONDITION_REQUIRED when If-Match header is absent", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 428);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "PRECONDITION_REQUIRED");
    assert.strictEqual(body.data, null);
  });

  test("DELETE /api/v1/agent-invoice/agents/:id — soft deletes agent with valid If-Match", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: { ...baseHeaders, "if-match": currentEtag },
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.code, "SUCCESS");
    assert.strictEqual(body.data, null);
  });

  test("GET /api/v1/agent-invoice/agents/:id — 404 RESOURCE_NOT_FOUND after soft delete", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/agent-invoice/agents/${createdAgentId}`,
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "RESOURCE_NOT_FOUND");
  });
});
