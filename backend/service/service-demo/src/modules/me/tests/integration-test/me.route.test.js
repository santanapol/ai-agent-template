import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import createApp from "../../../../app.js";

describe("GET /api/v1/me (integration)", () => {
  const env = {
    gatewaySharedSecret: "integration-test-gateway-secret",
    bodyLimit: 1048576,
  };
  let app;

  before(async () => {
    app = await createApp(env);
  });

  after(async () => {
    if (app) await app.close();
  });

  const trusted = {
    "x-gateway-secret": env.gatewaySharedSecret,
    "x-user-id": "user-int-1",
    "x-user-ou": "ou-int",
    "x-user-branch": "branch-int",
    accept: "application/json",
  };

  test("returns 200 and echoes trusted user context", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: trusted,
    });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.userId, "user-int-1");
    assert.strictEqual(body.data.ou, "ou-int");
    assert.strictEqual(body.data.branch, "branch-int");
  });

  test("returns 401 when gateway secret is wrong", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { ...trusted, "x-gateway-secret": "wrong" },
    });
    assert.strictEqual(res.statusCode, 401);
    const body = res.json();
    assert.strictEqual(body.success, false);
  });

  test("returns 403 when user context headers are incomplete", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        "x-gateway-secret": env.gatewaySharedSecret,
        "x-user-id": "u",
        "x-user-ou": "",
        "x-user-branch": "b",
        accept: "application/json",
      },
    });
    assert.strictEqual(res.statusCode, 403);
    const body = res.json();
    assert.strictEqual(body.success, false);
  });
});
