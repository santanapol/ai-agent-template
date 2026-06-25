import { test, describe, after } from "node:test";
import assert from "node:assert/strict";

import buildApp from "../../../app.js";
import { buildMeshHeaders } from "../../../lib/test-helpers/mesh-headers.js";
import CODES from "../../../lib/error-codes.js";

describe("smart-reports guards", () => {
  after(async () => {
    const { closeDatabase } = await import("../../../config/database.js");
    await closeDatabase();
  });
  test("rejects requests without x-gateway-secret (401 GATEWAY_SECRET_REJECTED)", async () => {
    const app = await buildApp();
    const headers = buildMeshHeaders();
    delete headers["x-gateway-secret"];

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, CODES.GATEWAY_SECRET_REJECTED);

    await app.close();
  });

  test("rejects requests with a wrong x-gateway-secret (401 GATEWAY_SECRET_REJECTED)", async () => {
    const app = await buildApp();
    const headers = buildMeshHeaders({ secret: "wrong-secret" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, CODES.GATEWAY_SECRET_REJECTED);

    await app.close();
  });

  test("rejects requests missing user context headers (403 MISSING_GATEWAY_USER_CONTEXT)", async () => {
    const app = await buildApp();
    const headers = buildMeshHeaders();
    delete headers["x-user-role"];

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, CODES.MISSING_GATEWAY_USER_CONTEXT);

    await app.close();
  });

  test("rejects requests with an invalid x-user-role (403 INVALID_USER_CONTEXT)", async () => {
    const app = await buildApp();
    const headers = buildMeshHeaders({ role: "super_admin" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, CODES.INVALID_USER_CONTEXT);

    await app.close();
  });

  test("accepts support role with reports:smart permission", async () => {
    const { connectDatabase } = await import("../../../config/database.js");
    await connectDatabase();

    const app = await buildApp();
    const headers = buildMeshHeaders({
      role: "support",
      permissions: "reports:smart",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);

    await app.close();
  });

  test("accepts support_admin role with reports:smart permission", async () => {
    const { connectDatabase } = await import("../../../config/database.js");
    await connectDatabase();

    const app = await buildApp();
    const headers = buildMeshHeaders({
      role: "support_admin",
      permissions: "reports:smart",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);

    await app.close();
  });

  test("rejects requests without reports:smart permission (403 PERMISSION_DENIED)", async () => {
    const app = await buildApp();
    const headers = buildMeshHeaders({ permissions: "profiles:list" });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports",
      headers,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, CODES.PERMISSION_DENIED);

    await app.close();
  });

  test("returns 404 NO_MATCHING_API_PATH for an unknown smart-reports path", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/smart-reports/unknown-resource",
      headers: buildMeshHeaders(),
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, CODES.NO_MATCHING_API_PATH);

    await app.close();
  });

  test("returns 404 NO_MATCHING_API_PATH for an unknown top-level path", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/unknown" });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, CODES.NO_MATCHING_API_PATH);

    await app.close();
  });
});
