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

  it("keeps p95 below agreed threshold for dashboard, items and error paths", async () => {
    const app = createApp(env);
    const dashboardLatencies = [];
    const itemsLatencies = [];
    const errorLatencies = [];

    for (let i = 0; i < 30; i += 1) {
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
      const errorRes = await request(app)
        .get("/api/v1/items/not-an-object-id")
        .set(headers);
      elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
      errorLatencies.push(elapsed);
      expect(errorRes.status).toBe(400);
    }

    const dashboardP95 = percentile(dashboardLatencies, 95);
    const itemsP95 = percentile(itemsLatencies, 95);
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
          key: "errors",
          label: "Error response",
          p95Ms: errorP95,
          thresholdMs: 250,
        },
      ],
    });

    expect(dashboardP95).toBeLessThan(400);
    expect(itemsP95).toBeLessThan(500);
    expect(errorP95).toBeLessThan(250);
    expect(report).toContain("| Dashboard summary |");
    expect(report).toContain("| Items list |");
    expect(report).toContain("| Error response |");
  });
});
