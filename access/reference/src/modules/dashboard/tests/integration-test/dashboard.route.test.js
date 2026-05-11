"use strict";

const request = require("supertest");
const createApp = require("../../../../app");

const state = {
  items: [],
  members: [],
  invoices: [],
};

function matchFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function mockCountCollection(listRef) {
  return {
    countDocuments: async (filter) =>
      listRef.filter((doc) => matchFilter(doc, filter)).length,
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name === "items") return mockCountCollection(state.items);
      if (name === "members") return mockCountCollection(state.members);
      if (name === "billing_invoices")
        return mockCountCollection(state.invoices);
      if (name === "billing_profiles") {
        return {
          findOne: async () => null,
          updateOne: async () => ({ acknowledged: true }),
        };
      }
      return {
        countDocuments: async () => 0,
        find: () => ({
          sort: () => ({
            skip: () => ({ limit: () => ({ toArray: async () => [] }) }),
          }),
        }),
      };
    }),
  })),
}));

describe("reference dashboard summary", () => {
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
  };
  const path = "/api/v1/ou/ou-001/branches/bkk-01/dashboard/summary";

  beforeEach(() => {
    state.items = [
      { ou_id: "ou-001", branch_id: "bkk-01" },
      { ou_id: "ou-001", branch_id: "bkk-01" },
    ];
    state.members = [{ ou_id: "ou-001", branch_id: "bkk-01" }];
    state.invoices = [{ ou_id: "ou-001", branch_id: "bkk-01", status: "open" }];
    jest.clearAllMocks();
  });

  it("returns full dashboard for billing role", async () => {
    const app = createApp(env);
    const response = await request(app)
      .get(path)
      .set({
        ...headers,
        "x-user-role": "billing",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.visibility).toBe("full");
    expect(response.body.data.widgets.invoices.open).toBe(1);
    expect(response.body.data.widgets.items.total).toBe(2);
  });

  it("returns limited dashboard for member role", async () => {
    const app = createApp(env);
    const response = await request(app)
      .get(path)
      .set({
        ...headers,
        "x-user-role": "member",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.visibility).toBe("limited");
    expect(response.body.data.widgets.items.total).toBe(2);
    expect(response.body.data.widgets.invoices).toBeUndefined();
  });

  it("rejects branch mismatch for member role", async () => {
    const app = createApp(env);
    const response = await request(app)
      .get("/api/v1/ou/ou-001/branches/cnx-01/dashboard/summary")
      .set({
        ...headers,
        "x-user-role": "member",
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("INVALID_USER_CONTEXT");
  });
});
