import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { readEnv } from "../../config/env.js";

const env = readEnv();

describe("App global routes", async () => {
  if (!env.mongoUri) {
    test("skip because MONGODB_URI is empty", () => {
      assert.ok(true);
    });
    return;
  }

  const { connectDatabase, closeDatabase } =
    await import("../../config/database.js");
  const { default: createApp } = await import("../../app.js");

  let app;

  before(async () => {
    await connectDatabase();
    app = await createApp(env);
  });

  after(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  test("GET /healthz returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.status, "ok");
    assert.ok(typeof body.uptime === "number");
  });

  test("GET /readyz returns 200 when DB is connected", async () => {
    const res = await app.inject({ method: "GET", url: "/readyz" });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.status, "ok");
  });

  test("GET /readyz returns 503 when DB is disconnected", async () => {
    await closeDatabase();
    const res = await app.inject({ method: "GET", url: "/readyz" });
    assert.strictEqual(res.statusCode, 503);
    const body = res.json();
    assert.strictEqual(body.code, "SERVICE_NOT_READY");
    await connectDatabase(); // reconnect for other tests
  });

  test("GET /api/v1/unknown-path returns 404 custom error", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/unknown-path",
      headers: {
        "x-gateway-secret": env.gatewaySharedSecret,
        "x-user-id": "tester",
        "x-user-ou": "testou",
        "x-user-branch": "testbranch",
      },
    });
    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.code, "NO_MATCHING_API_PATH");
  });

  test("GET /unknown-path returns 404 custom error", async () => {
    const res = await app.inject({ method: "GET", url: "/unknown-path" });
    assert.strictEqual(res.statusCode, 404);
    const body = res.json();
    assert.strictEqual(body.code, "NO_MATCHING_API_PATH");
  });

  // Since testing rate limiting involves sending 1000 requests, we might skip it or use a fast loop.
});
