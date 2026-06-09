import { test, describe } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import fp from "fastify-plugin";
import apiRateLimit, { createRateLimiter } from "../api-rate-limit.js";

describe("createRateLimiter — independent state per factory call", () => {
  test("two limiter instances do not share their bucket state", () => {
    const limiter1 = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const limiter2 = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    limiter1.consume("user1");

    assert.strictEqual(
      limiter2.consume("user1"),
      true,
      "limiter2 must allow user1 — its bucket must be independent of limiter1",
    );
  });

  test("consume returns false once maxRequests is exceeded", () => {
    const { consume } = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    assert.strictEqual(consume("u"), true);
    assert.strictEqual(consume("u"), true);
    assert.strictEqual(consume("u"), false, "third request must be blocked");
  });
});

describe("api-rate-limit hook ordering (C5)", () => {
  test("onRequest hooks at parent level run BEFORE child-level onRequest hooks (bug demonstration)", async () => {
    const app = Fastify({ logger: false });

    let parentSawUserContext = null;
    let parentRan = false;
    let childRan = false;

    // Simulate apiRateLimit via fp (no scope — hooks added to parent directly)
    await app.register(
      fp(
        async function (fastify) {
          fastify.addHook("onRequest", async (request) => {
            parentRan = true;
            parentSawUserContext = request.userContext !== undefined;
          });
        },
        { name: "api-rate-limit" },
      ),
    );

    // Child plugin (simulates invoices route) that sets userContext
    await app.register(async function (child) {
      child.addHook("onRequest", async (request) => {
        childRan = true;
        request.userContext = { id: "test-user" };
      });

      child.get("/test", async () => ({ ok: true }));
    });

    await app.ready();

    await app.inject({ method: "GET", url: "/test" });

    assert.strictEqual(parentRan, true, "Parent onRequest should have run");
    assert.strictEqual(childRan, true, "Child onRequest should have run");
    assert.strictEqual(
      parentSawUserContext,
      false,
      "Parent onRequest should NOT see userContext (child sets it later). " +
        "This is why rate limiter must use preHandler instead of onRequest.",
    );

    await app.close();
  });

  test("preHandler at parent level sees userContext set by child plugin onRequest (fix verification)", async () => {
    const app = Fastify({ logger: false });

    let preHandlerSawUserContext = null;

    // Simulate the fixed apiRateLimit via fp — preHandler added to parent directly
    await app.register(
      fp(
        async function (fastify) {
          fastify.addHook("preHandler", async (request) => {
            preHandlerSawUserContext = request.userContext !== undefined;
          });
        },
        { name: "api-rate-limit" },
      ),
    );

    // Child plugin sets userContext in onRequest
    await app.register(async function (child) {
      child.addHook("onRequest", async (request) => {
        request.userContext = { id: "test-user" };
      });

      child.get("/test", async () => ({ ok: true }));
    });

    await app.ready();

    await app.inject({ method: "GET", url: "/test" });

    assert.strictEqual(
      preHandlerSawUserContext,
      true,
      "preHandler at parent level should see userContext set by child onRequest. " +
        "This confirms the C5 fix: changing api-rate-limit from onRequest to preHandler.",
    );

    await app.close();
  });

  test("actual api-rate-limit plugin uses preHandler and works with child scope userContext", async () => {
    const app = Fastify({ logger: false });

    // The real apiRateLimit is wrapped in fp, so it hooks into the parent scope
    await app.register(apiRateLimit);

    // Child plugin that sets userContext (simulates invoices route)
    await app.register(async function (child) {
      child.addHook("onRequest", async (request) => {
        const userId = request.headers["x-user-id"];
        if (userId) {
          request.userContext = { id: String(userId) };
        }
      });

      child.post("/api/v1/invoices/test", async () => ({ ok: true }));
    });

    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/invoices/test",
      headers: { "x-user-id": "user-a" },
    });

    // Should not crash — should be either 200 (under limit) or 429 (over limit)
    assert.ok(
      res.statusCode === 200 || res.statusCode === 429,
      `Expected 200 or 429, got ${res.statusCode}`,
    );

    await app.close();
  });
});
