import { test, describe, before, after } from "node:test";
import assert from "node:assert";

import createApp from "../../app.js";

describe("probe routes (T01)", () => {
  let app;

  before(async () => {
    app = await createApp({
      appName: "staff-service",
      nodeEnv: "test",
      port: 3101,
      dbName: "zero-platform",
      mongoUri: "",
      gatewaySharedSecret: "test-secret",
      authInternalBaseUrl: "http://127.0.0.1:3001",
      authInternalServiceSecret: "internal-secret",
      staffProvisionDefaultRole: "staff",
      shutdownTimeoutMs: 5000,
      bodyLimit: "1mb",
      maxPoolSize: 10,
      minPoolSize: 2,
      authRevokeMaxRetries: 3,
      authRevokeBackoffMs: 200,
    });
  });

  after(async () => {
    if (app) await app.close();
  });

  test("GET /healthz returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.service, "staff-service");
  });

  test("GET /readyz returns 503 until Mongo (T04)", async () => {
    const res = await app.inject({ method: "GET", url: "/readyz" });
    assert.strictEqual(res.statusCode, 503);
    const body = res.json();
    assert.strictEqual(body.code, "SERVICE_NOT_READY");
  });
});
