import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { buildApp } from "../src/app.js";

const GATEWAY_SECRET = "test-gateway-secret";

const validUserHeaders = {
  "x-gateway-secret": GATEWAY_SECRET,
  "x-user-ou": "507f1f77bcf86cd799439011",
  "x-user-branch": "507f1f77bcf86cd799439012",
};

/** @type {import('fastify').FastifyInstance} */
let app;

before(async () => {
  app = await buildApp({
    logger: false,
    gatewaySecret: GATEWAY_SECRET,
    registerProbeRoute: true,
  });
});

after(async () => {
  await app.close();
});

describe("branch-report scaffold (T1)", () => {
  it("GET /healthz returns success without gateway headers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/healthz",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.code, "SUCCESS");
    assert.equal(body.data.status, "ok");
    assert.ok(body.requestId);
    assert.ok(response.headers["x-request-id"]);
  });

  it("GET /readyz returns 503 when database is not connected", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/readyz",
    });

    assert.equal(response.statusCode, 503);
    const body = response.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "SERVICE_UNAVAILABLE");
    assert.equal(body.data, null);
  });

  it("rejects missing x-gateway-secret on protected routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/_probe",
      headers: {
        "x-user-ou": validUserHeaders["x-user-ou"],
        "x-user-branch": validUserHeaders["x-user-branch"],
      },
    });

    assert.equal(response.statusCode, 401);
    const body = response.json();
    assert.equal(body.code, "GATEWAY_SECRET_REJECTED");
    assert.equal(body.data, null);
  });

  it("rejects missing user context on protected routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/_probe",
      headers: {
        "x-gateway-secret": GATEWAY_SECRET,
      },
    });

    assert.equal(response.statusCode, 403);
    const body = response.json();
    assert.equal(body.code, "MISSING_GATEWAY_USER_CONTEXT");
  });

  it("rejects duplicate critical headers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/_probe",
      headers: {
        ...validUserHeaders,
        "x-user-branch": "branch-a, branch-b",
      },
    });

    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.code, "INVALID_HEADER");
  });

  it("allows protected probe with valid gateway and user headers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/_probe",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.service, "branch-report");
    assert.ok(body.requestId);
  });

  it("returns INVALID_PARAM envelope for validation errors", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/_probe?page=0",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "INVALID_PARAM");
    assert.equal(body.data, null);
    assert.ok(body.requestId);
  });

  it("returns NO_MATCHING_API_PATH for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/unknown",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 404);
    const body = response.json();
    assert.equal(body.code, "NO_MATCHING_API_PATH");
  });
});
