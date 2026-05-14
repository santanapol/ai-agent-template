"use strict";

jest.mock("../../../config/database", () => ({
  pingDatabase: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const createApp = require("../../../app");

describe("app HTTP smoke (integration)", () => {
  const env = {
    gatewaySharedSecret: "smoke-test-gateway-secret",
    bodyLimit: "1mb",
  };
  let app;

  beforeAll(() => {
    app = createApp(env);
  });

  it("GET /healthz returns success envelope", async () => {
    const res = await request(app).get("/healthz").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /readyz uses pingDatabase and returns ready", async () => {
    const { pingDatabase } = require("../../../config/database");
    const res = await request(app).get("/readyz").expect(200);
    expect(pingDatabase).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ready");
  });

  it("GET /metrics without secret returns 401", async () => {
    const res = await request(app).get("/metrics").expect(401);
    expect(res.body.success).toBe(false);
  });

  it("GET /metrics with valid secret returns Prometheus text", async () => {
    const res = await request(app)
      .get("/metrics")
      .set("x-gateway-secret", env.gatewaySharedSecret)
      .expect(200);
    expect(res.text).toContain("http_requests_total");
  });
});
