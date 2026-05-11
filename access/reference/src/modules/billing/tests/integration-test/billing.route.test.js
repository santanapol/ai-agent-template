"use strict";

const request = require("supertest");
const createApp = require("../../../../app");

const state = {
  billingProfiles: [],
  billingInvoices: [],
};

function clone(doc) {
  return { ...doc };
}

function matchFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function mockProfilesCollection() {
  return {
    findOne: async (filter) => {
      const doc = state.billingProfiles.find((row) => matchFilter(row, filter));
      return doc ? clone(doc) : null;
    },
    updateOne: async (filter, update, options = {}) => {
      const index = state.billingProfiles.findIndex((row) =>
        matchFilter(row, filter),
      );
      if (index >= 0) {
        state.billingProfiles[index] = {
          ...state.billingProfiles[index],
          ...update.$set,
        };
      } else if (options.upsert) {
        state.billingProfiles.push({
          ...filter,
          ...update.$setOnInsert,
          ...update.$set,
        });
      }
      return { acknowledged: true };
    },
  };
}

function mockInvoicesCollection() {
  return {
    countDocuments: async (filter) =>
      state.billingInvoices.filter((row) => matchFilter(row, filter)).length,
    find: (filter) => {
      const docs = state.billingInvoices.filter((row) =>
        matchFilter(row, filter),
      );
      return {
        sort: () => ({
          skip: (skip) => ({
            limit: (limit) => ({
              toArray: async () =>
                docs.slice(skip, skip + limit).map((row) => clone(row)),
            }),
          }),
        }),
      };
    },
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name === "billing_profiles") return mockProfilesCollection();
      if (name === "billing_invoices") return mockInvoicesCollection();
      if (name === "members") {
        return {
          countDocuments: async () => 0,
          find: () => ({
            sort: () => ({
              skip: () => ({ limit: () => ({ toArray: async () => [] }) }),
            }),
          }),
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

describe("reference branch billing routes", () => {
  const env = {
    gatewaySharedSecret: "secret-123",
    bodyLimit: "1mb",
    requestTimeoutMs: 30000,
    shutdownTimeoutMs: 10000,
  };
  const baseHeaders = {
    "x-gateway-secret": "secret-123",
    "x-user-id": "user-001",
    "x-user-ou": "ou-001",
    "x-user-branch": "bkk-01",
    "content-type": "application/json",
  };
  const basePath = "/api/v1/ou/ou-001/branches/bkk-01/billing";

  beforeEach(() => {
    state.billingProfiles = [];
    state.billingInvoices = [
      {
        ou_id: "ou-001",
        branch_id: "bkk-01",
        invoice_id: "inv-001",
        amount: 1000,
        currency: "THB",
        status: "open",
        issued_at: "2026-05-01T00:00:00.000Z",
        due_at: "2026-05-15T00:00:00.000Z",
      },
    ];
    jest.clearAllMocks();
  });

  it("allows billing role to read plan/invoices and blocks manage", async () => {
    const app = createApp(env);
    const headers = { ...baseHeaders, "x-user-role": "billing" };

    const planRes = await request(app).get(`${basePath}/plan`).set(headers);
    expect(planRes.status).toBe(200);
    expect(planRes.body.data.planCode).toBeDefined();

    const invoicesRes = await request(app)
      .get(`${basePath}/invoices`)
      .set(headers);
    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.data).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`${basePath}/plan`)
      .set(headers)
      .send({ planCode: "growth" });
    expect(patchRes.status).toBe(403);
    expect(patchRes.body.code).toBe("INVALID_USER_CONTEXT");
  });

  it("allows admin to manage billing by default", async () => {
    const app = createApp(env);
    const headers = { ...baseHeaders, "x-user-role": "admin" };

    const patchRes = await request(app)
      .patch(`${basePath}/plan`)
      .set(headers)
      .send({ planCode: "growth" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.planCode).toBe("growth");

    const planRes = await request(app).get(`${basePath}/plan`).set(headers);
    expect(planRes.status).toBe(200);
    expect(planRes.body.data.planCode).toBe("growth");
  });

  it("blocks billing role from reading another branch", async () => {
    const app = createApp(env);
    const headers = { ...baseHeaders, "x-user-role": "billing" };

    const response = await request(app)
      .get("/api/v1/ou/ou-001/branches/cnx-01/billing/plan")
      .set(headers);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("INVALID_USER_CONTEXT");
  });
});
