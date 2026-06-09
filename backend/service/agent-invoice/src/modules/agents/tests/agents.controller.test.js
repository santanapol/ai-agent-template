import { test } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import { getAgentsHandler } from "../agents.controller.js";

async function buildTestApp({ dbThrows = false } = {}) {
  const app = Fastify({ logger: false });

  app.decorateRequest("requestId", null);
  app.addHook("onRequest", async (request) => {
    request.requestId = request.headers["x-request-id"] ?? "test-req";
  });

  app.decorate("db", {
    collection: () => ({
      aggregate: () => {
        if (dbThrows) throw new Error("Simulated DB failure");
        return { toArray: async () => [] };
      },
      countDocuments: async () => {
        if (dbThrows) throw new Error("Simulated DB failure");
        return 0;
      },
    }),
  });

  app.get("/agents", {
    handler: getAgentsHandler,
  });

  await app.ready();
  return app;
}

test("getAgentsHandler — returns success envelope when service succeeds", async () => {
  const app = await buildTestApp({ dbThrows: false });

  const res = await app.inject({
    method: "GET",
    url: "/agents?page=1&limit=10",
    headers: { "x-user-ou": "000000000000000000000123" },
  });

  await app.close();

  assert.strictEqual(res.statusCode, 200);
  const body = res.json();
  assert.strictEqual(body.success, true);
  assert.ok(Array.isArray(body.data));
});

test("getAgentsHandler — returns structured error envelope when service throws", async () => {
  const app = await buildTestApp({ dbThrows: true });

  const res = await app.inject({
    method: "GET",
    url: "/agents?page=1&limit=10",
    headers: { "x-user-ou": "000000000000000000000123" },
  });

  await app.close();

  // Without try/catch: Fastify returns {"statusCode":500,"error":"Internal Server Error"}
  // With try/catch + handleError: our envelope {"success":false,"code":"INTERNAL_ERROR"}
  assert.strictEqual(res.statusCode, 500);
  const body = res.json();
  assert.strictEqual(
    body.success,
    false,
    "response must use our success:false envelope",
  );
  assert.strictEqual(
    body.code,
    "INTERNAL_ERROR",
    "response must use our INTERNAL_ERROR code",
  );
  assert.strictEqual(body.data, null);
});
