"use strict";

const request = require("supertest");
const createApp = require("../../../../app");
const { formatLatencyReport } = require("../../latency-report");

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function mockCollection() {
  return {
    countDocuments: async () => 1,
    find: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            toArray: async () => [],
          }),
        }),
      }),
    }),
    findOne: async () => null,
    updateOne: async () => ({ acknowledged: true }),
    insertOne: async () => ({ acknowledged: true }),
    findOneAndUpdate: async () => null,
    deleteOne: async () => ({ deletedCount: 0 }),
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn(() => mockCollection()),
  })),
}));

describe("time-metric verification (p95)", () => {
  const env = {
    gatewaySharedSecret: "secret-123",
    bodyLimit: "1mb",
    requestTimeoutMs: 30000,
    shutdownTimeoutMs: 10000,
  };
  const headers = {
    "x-gateway-secret": "secret-123",
    "x-user-id": "user-001",
    "x-user-ou": "ou-001",
    "x-user-branch": "bkk-01",
    "x-user-role": "admin",
  };
  const headersForWrite = {
    "x-gateway-secret": "secret-123",
    "x-user-id": "user-412",
    "x-user-ou": "ou-001",
    "x-user-branch": "bkk-01",
    "x-user-role": "admin",
  };

  it("keeps p95 below agreed threshold for dashboard, items and error paths", async () => {
    const app = createApp(env);
    const dashboardLatencies = [];
    const itemsLatencies = [];
    const error400Latencies = [];
    const error404Latencies = [];
    const error412Latencies = [];
    const errorLatencies = [];

    for (let i = 0; i < 20; i += 1) {
      let start = process.hrtime.bigint();
      const dashboardRes = await request(app)
        .get("/api/v1/ou/ou-001/branches/bkk-01/dashboard/summary")
        .set(headers);
      let elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      dashboardLatencies.push(elapsed);
      expect(dashboardRes.status).toBe(200);

      start = process.hrtime.bigint();
      const membersRes = await request(app).get("/api/v1/items").set(headers);
      elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      itemsLatencies.push(elapsed);
      expect(membersRes.status).toBe(200);

      start = process.hrtime.bigint();
      const invalidIdRes = await request(app)
        .get("/api/v1/items/not-an-object-id")
        .set(headers);
      elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      error400Latencies.push(elapsed);
      errorLatencies.push(elapsed);
      expect(invalidIdRes.status).toBe(400);

      start = process.hrtime.bigint();
      const notFoundRes = await request(app)
        .get("/api/v1/items/507f1f77bcf86cd799439011")
        .set(headers);
      elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      error404Latencies.push(elapsed);
      errorLatencies.push(elapsed);
      expect(notFoundRes.status).toBe(404);

      start = process.hrtime.bigint();
      const conflictRes = await request(app)
        .patch("/api/v1/items/507f1f77bcf86cd799439011")
        .set(headersForWrite)
        .set("if-match", 'W/"not-a-valid-etag"')
        .set("content-type", "application/json")
        .send({ name: "Updated Item" });
      elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      error412Latencies.push(elapsed);
      errorLatencies.push(elapsed);
      expect(conflictRes.status).toBe(412);
    }

    const dashboardP95 = percentile(dashboardLatencies, 95);
    const itemsP95 = percentile(itemsLatencies, 95);
    const error400P95 = percentile(error400Latencies, 95);
    const error404P95 = percentile(error404Latencies, 95);
    const error412P95 = percentile(error412Latencies, 95);
    const errorP95 = percentile(errorLatencies, 95);

    const report = formatLatencyReport({
      generatedAt: new Date().toISOString(),
      metrics: [
        {
          key: "dashboard",
          label: "Dashboard summary",
          p95Ms: dashboardP95,
          thresholdMs: 400,
        },
        {
          key: "items",
          label: "Items list",
          p95Ms: itemsP95,
          thresholdMs: 500,
        },
        {
          key: "errors-invalid-id",
          label: "Error 400 invalid id",
          p95Ms: error400P95,
          thresholdMs: 250,
        },
        {
          key: "errors-not-found",
          label: "Error 404 not found",
          p95Ms: error404P95,
          thresholdMs: 250,
        },
        {
          key: "errors-conflict",
          label: "Error 412 version conflict",
          p95Ms: error412P95,
          thresholdMs: 250,
        },
        {
          key: "errors",
          label: "Error response",
          p95Ms: errorP95,
          thresholdMs: 250,
        },
      ],
    });

    expect(dashboardP95).toBeLessThan(400);
    expect(itemsP95).toBeLessThan(500);
    expect(error400P95).toBeLessThan(250);
    expect(error404P95).toBeLessThan(250);
    expect(error412P95).toBeLessThan(250);
    expect(errorP95).toBeLessThan(250);
    expect(report).toContain("| Dashboard summary |");
    expect(report).toContain("| Items list |");
    expect(report).toContain("| Error 400 invalid id |");
    expect(report).toContain("| Error 404 not found |");
    expect(report).toContain("| Error 412 version conflict |");
    expect(report).toContain("| Error response |");
  });
});
