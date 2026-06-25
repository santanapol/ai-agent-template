import { test, describe } from "node:test";
import assert from "node:assert";
import http from "node:http";
import Fastify from "fastify";
import userContextGuard from "../../../plugins/user-context.js";
import duplicateHeaderGuard from "../../../plugins/duplicate-header.js";
import { buildMeshHeaders } from "../../test-helpers/mesh-headers.js";
import CODES from "../../error-codes.js";

async function createTestApp() {
  const fastify = Fastify({
    logger: false,
  });

  // ลงทะเบียน error handler เลียนแบบระบบจริง เพื่อให้โยน error envelope
  fastify.setErrorHandler((error, request, reply) => {
    reply.status(error.status || error.statusCode || 500).send({
      success: false,
      code: error.code || "INTERNAL_ERROR",
      message: error.message,
    });
  });

  await fastify.register(duplicateHeaderGuard);
  await fastify.register(userContextGuard);

  fastify.get("/test-context", async (request) => {
    return {
      userContext: request.userContext,
    };
  });

  await fastify.ready();
  return fastify;
}

describe("user-context & duplicate-header plugins", () => {
  test("successfully parses x-user-permissions comma-separated string to array", async () => {
    const app = await createTestApp();
    const headers = buildMeshHeaders();
    headers["x-user-permissions"] = "profiles:list,profiles:read";

    const res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.deepStrictEqual(body.userContext.permissions, [
      "profiles:list",
      "profiles:read",
    ]);
    await app.close();
  });

  test("returns empty permissions array if header is missing or empty string", async () => {
    const app = await createTestApp();
    const headers = buildMeshHeaders();
    let res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json().userContext.permissions, []);

    headers["x-user-permissions"] = "";
    res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json().userContext.permissions, []);
    await app.close();
  });

  test("accepts support_admin x-user-role (prod smart-report regression)", async () => {
    const app = await createTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers: buildMeshHeaders({ role: "support_admin" }),
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json().userContext.role, "support_admin");
    await app.close();
  });

  test("rejects invalid x-user-role with INVALID_USER_CONTEXT", async () => {
    const app = await createTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers: buildMeshHeaders({ role: "super_admin" }),
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    await app.close();
  });

  test("parses optional x-user-home-branch into userContext", async () => {
    const app = await createTestApp();
    const headers = buildMeshHeaders({
      branchId: "507f1f77bcf86cd799439014",
      homeBranchId: "507f1f77bcf86cd799439012",
    });

    const res = await app.inject({
      method: "GET",
      url: "/test-context",
      headers,
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.userContext.branchId, "507f1f77bcf86cd799439014");
    assert.strictEqual(body.userContext.homeBranchId, "507f1f77bcf86cd799439012");
    await app.close();
  });

  test("rejects request if x-user-permissions is duplicated", async () => {
    const app = await createTestApp();
    await app.listen({ port: 0 });
    const port = app.server.address().port;

    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/test-context",
          method: "GET",
          headers: {
            "x-gateway-secret": "test-gateway-secret-32-chars-minimum!!",
            "x-user-id": "507f1f77bcf86cd799439013",
            "x-user-ou": "507f1f77bcf86cd799439011",
            "x-user-branch": "507f1f77bcf86cd799439012",
            "x-user-role": "platform_admin",
            "x-user-permissions": ["profiles:list", "profiles:read"],
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve({
              status: res.statusCode,
              body: data,
            });
          });
        },
      );
      req.on("error", reject);
      req.end();
    });

    assert.strictEqual(res.status, 400);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.code, CODES.INVALID_HEADER);
    assert.match(body.message, /Invalid header: x-user-permissions/i);
    await app.close();
  });
});
