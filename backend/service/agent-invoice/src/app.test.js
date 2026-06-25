import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import buildApp from "./app.js";
import {
  buildMeshHeaders,
} from "./lib/test-helpers/mesh-headers.js";

describe("App infrastructure behaviors", () => {
  let app;
  const baseHeaders = buildMeshHeaders({
    userId: "test_infra_user",
    role: "platform_admin",
  });

  before(async () => {
    app = await buildApp({ logger: false });
  });

  after(async () => {
    if (app) await app.close();
  });

  test("GET /healthz — returns 200 with status, timestamp, and uptime (no auth required)", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.status, "ok");
    assert.ok(
      typeof body.timestamp === "string",
      "timestamp should be a string",
    );
    assert.ok(typeof body.uptime === "number", "uptime should be a number");
    assert.ok(body.uptime >= 0);
  });

  test("GET /readyz — returns 200 with database dependency status when DB is reachable", async () => {
    const res = await app.inject({ method: "GET", url: "/readyz" });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.status, "ok");
    assert.ok(Array.isArray(body.dependencies));
    const dbDep = body.dependencies.find((d) => d.name === "database");
    assert.ok(dbDep, "database dependency should be present");
    assert.strictEqual(dbDep.status, "ok");
  });

  test("x-request-id absent — generates a UUID and echoes it in the response header", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });

    const requestId = res.headers["x-request-id"];
    assert.ok(requestId, "x-request-id response header must be present");
    // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    assert.match(
      requestId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("x-request-id present — echoes the client value unchanged in the response header", async () => {
    const clientId = "my-trace-id-abc-123";

    const res = await app.inject({
      method: "GET",
      url: "/healthz",
      headers: { "x-request-id": clientId },
    });

    assert.strictEqual(res.headers["x-request-id"], clientId);
  });

  test("Missing x-gateway-secret — returns 401 GATEWAY_SECRET_REJECTED", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents",
      headers: { "x-user-id": "user-1" },
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "GATEWAY_SECRET_REJECTED");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("Wrong x-gateway-secret — returns 401 GATEWAY_SECRET_REJECTED", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents",
      headers: { "x-gateway-secret": "wrong-secret", "x-user-id": "user-1" },
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "GATEWAY_SECRET_REJECTED");
  });

  test("Invalid x-user-role — returns 403 INVALID_USER_CONTEXT", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents",
      headers: buildMeshHeaders({ role: "super_admin" }),
    });

    assert.strictEqual(res.statusCode, 403);
    const body = res.json();
    assert.strictEqual(body.code, "INVALID_USER_CONTEXT");
    assert.match(body.message, /x-user-role/i);
  });

  test("support_admin x-user-role passes mesh guard (agents:list)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents",
      headers: buildMeshHeaders({
        role: "support_admin",
        permissions: "agents:list",
      }),
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json().success, true);
  });

  test("DELETE with Content-Type application/json and empty body does not return 500", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/agent-invoice/agents/665a3d76b1e5f8b9e6f2b9a1",
      headers: {
        ...baseHeaders,
        "content-type": "application/json",
      },
      payload: "",
    });

    assert.notStrictEqual(res.statusCode, 500);
  });

  test("Invalid agentId pattern — Fastify param validation returns 400 INVALID_PARAM", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/agent-invoice/agents/not-a-valid-objectid/fees",
      headers: baseHeaders,
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "INVALID_PARAM");
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("Invalid POST body — missing required fields returns 400 INVALID_PARAM", async () => {
    const agentId = "665a3d76b1e5f8b9e6f2b9a1";

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/agent-invoice/agents/${agentId}/fees`,
      headers: baseHeaders,
      payload: {},
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "INVALID_PARAM");
  });
});
