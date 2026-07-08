import { test, describe, before, after } from "node:test";
import assert from "node:assert";

import createApp from "../../app.js";
import { buildMeshHeaders } from "../../lib/test-helpers/mesh-headers.js";
import CODES from "../../lib/error-codes.js";

describe("mesh guards (T03)", () => {
  const env = {
    appName: "staff-service",
    nodeEnv: "test",
    port: 3101,
    dbName: "zero-platform",
    mongoUri: "",
    gatewaySharedSecret: "test-gateway-secret-32-chars-minimum!!",
    authInternalBaseUrl: "http://127.0.0.1:3001",
    authInternalServiceSecret: "internal-secret",
    staffProvisionDefaultRole: "staff",
    shutdownTimeoutMs: 5000,
    bodyLimit: "1mb",
    maxPoolSize: 10,
    minPoolSize: 2,
    authRevokeMaxRetries: 3,
    authRevokeBackoffMs: 200,
  };

  let app;

  before(async () => {
    app = await createApp(env);
  });

  after(async () => {
    if (app) await app.close();
  });

  test("missing x-gateway-secret returns 401 GATEWAY_SECRET_REJECTED", async () => {
    const headers = buildMeshHeaders();
    delete headers["x-gateway-secret"];

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/staff/profiles",
      headers,
    });

    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, CODES.GATEWAY_SECRET_REJECTED);
    assert.strictEqual(body.data, null);
    assert.ok(body.requestId);
  });

  test("wrong gateway secret returns 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/staff/profiles",
      headers: buildMeshHeaders({ secret: "wrong-secret-value-32-chars-xx!!" }),
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.json().code, CODES.GATEWAY_SECRET_REJECTED);
  });

  test("missing user context returns 403 MISSING_GATEWAY_USER_CONTEXT", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/staff/profiles",
      headers: {
        "x-gateway-secret": env.gatewaySharedSecret,
        accept: "application/json",
      },
    });

    assert.strictEqual(res.statusCode, 403);
    const body = res.json();
    assert.strictEqual(body.code, CODES.MISSING_GATEWAY_USER_CONTEXT);
    assert.strictEqual(body.data, null);
  });

  test("invalid x-user-ou returns 403 INVALID_USER_CONTEXT", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/staff/profiles",
      headers: buildMeshHeaders({ ouId: "not-a-valid-object-id" }),
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
  });

  test("valid mesh headers pass gateway guards (no 401 or 403)", async () => {
    const headers = buildMeshHeaders({ role: "branch_admin" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/staff/profiles",
      headers,
    });

    // Gateway secret and user context guards pass — a non-4xx status
    // confirms the mesh authentication layer works correctly.
    assert.ok(res.statusCode < 400 || res.statusCode >= 500);
    assert.notStrictEqual(res.statusCode, 401);
    assert.notStrictEqual(res.statusCode, 403);
  });

  test("validation error returns 400 INVALID_PARAM envelope", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/staff/profiles",
      headers: buildMeshHeaders(),
      payload: {},
    });

    assert.strictEqual(res.statusCode, 400);
    const body = res.json();
    assert.strictEqual(body.code, CODES.INVALID_PARAM);
    assert.strictEqual(body.message, "Request validation failed");
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });
});
