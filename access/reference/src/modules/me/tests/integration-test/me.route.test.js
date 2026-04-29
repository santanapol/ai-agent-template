"use strict";

const request = require("supertest");
const createApp = require("../../../../app");

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(),
}));

describe("reference GET /api/v1/me", () => {
  const env = {
    gatewaySharedSecret: "secret-123",
    bodyLimit: "1mb",
    requestTimeoutMs: 30000,
    shutdownTimeoutMs: 10000,
  };
  const base = {
    "x-gateway-secret": "secret-123",
    "x-user-id": "user-001",
    "x-user-ou": "ou-001",
    "x-user-branch": "bkk-01",
  };

  it("returns user context from trusted headers", async () => {
    const app = createApp(env);
    const res = await request(app)
      .get("/api/v1/me")
      .set({ ...base, "x-user-role": "analyst" });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("SUCCESS");
    expect(res.body.data).toEqual({
      userId: "user-001",
      ou: "ou-001",
      branch: "bkk-01",
      role: "analyst",
    });
  });

  it("returns null role when x-user-role omitted", async () => {
    const app = createApp(env);
    const res = await request(app).get("/api/v1/me").set(base);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBeNull();
  });

  it("returns 403 when user context is incomplete", async () => {
    const app = createApp(env);
    const res = await request(app)
      .get("/api/v1/me")
      .set({ "x-gateway-secret": "secret-123", "x-user-id": "user-001" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("MISSING_GATEWAY_USER_CONTEXT");
  });
});
