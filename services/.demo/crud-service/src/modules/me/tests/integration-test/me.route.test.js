"use strict";

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const createApp = require("../../../../app");

describe("GET /api/v1/me (integration)", () => {
  const env = {
    gatewaySharedSecret: "integration-test-gateway-secret",
    bodyLimit: "1mb",
  };
  let app;

  beforeAll(() => {
    app = createApp(env);
  });

  const trusted = {
    "x-gateway-secret": env.gatewaySharedSecret,
    "x-user-id": "user-int-1",
    "x-user-ou": "ou-int",
    "x-user-branch": "branch-int",
    Accept: "application/json",
  };

  it("returns 200 and echoes trusted user context", async () => {
    const res = await request(app).get("/api/v1/me").set(trusted).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      userId: "user-int-1",
      ou: "ou-int",
      branch: "branch-int",
    });
  });

  it("returns 401 when gateway secret is wrong", async () => {
    const res = await request(app)
      .get("/api/v1/me")
      .set({ ...trusted, "x-gateway-secret": "wrong" })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 403 when user context headers are incomplete", async () => {
    const res = await request(app)
      .get("/api/v1/me")
      .set({
        "x-gateway-secret": env.gatewaySharedSecret,
        "x-user-id": "u",
        "x-user-ou": "",
        "x-user-branch": "b",
        Accept: "application/json",
      })
      .expect(403);
    expect(res.body.success).toBe(false);
  });
});
