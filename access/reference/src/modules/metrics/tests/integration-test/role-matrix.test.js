"use strict";

const request = require("supertest");
const createApp = require("../../../../app");

const store = {
  members: [],
  billingProfiles: [],
  billingInvoices: [],
  items: [],
};

function matchFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function mockCollection(name) {
  if (name === "members") {
    return {
      countDocuments: async (filter) =>
        store.members.filter((doc) => matchFilter(doc, filter)).length,
      find: (filter) => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: async () =>
                store.members.filter((doc) => matchFilter(doc, filter)),
            }),
          }),
        }),
      }),
      insertOne: async (doc) => {
        store.members.push({ ...doc });
        return { acknowledged: true };
      },
      findOneAndUpdate: async (_filter, _update) => null,
      deleteOne: async () => ({ deletedCount: 0 }),
    };
  }

  if (name === "billing_profiles") {
    return {
      findOne: async (filter) =>
        store.billingProfiles.find((doc) => matchFilter(doc, filter)) || null,
      updateOne: async (filter, update, options = {}) => {
        const index = store.billingProfiles.findIndex((doc) =>
          matchFilter(doc, filter),
        );
        if (index >= 0) {
          store.billingProfiles[index] = {
            ...store.billingProfiles[index],
            ...update.$set,
          };
        } else if (options.upsert) {
          store.billingProfiles.push({
            ...filter,
            ...update.$setOnInsert,
            ...update.$set,
          });
        }
        return { acknowledged: true };
      },
    };
  }

  if (name === "billing_invoices") {
    return {
      countDocuments: async (filter) =>
        store.billingInvoices.filter((doc) => matchFilter(doc, filter)).length,
      find: (filter) => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: async () =>
                store.billingInvoices.filter((doc) => matchFilter(doc, filter)),
            }),
          }),
        }),
      }),
    };
  }

  if (name === "items") {
    return {
      countDocuments: async (filter) =>
        store.items.filter((doc) => matchFilter(doc, filter)).length,
    };
  }

  return {
    countDocuments: async () => 0,
    find: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            toArray: async () => [],
          }),
        }),
      }),
    }),
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn((name) => mockCollection(name)),
  })),
}));

describe("role matrix verification", () => {
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

  beforeEach(() => {
    store.members = [];
    store.billingProfiles = [];
    store.billingInvoices = [
      {
        ou_id: "ou-001",
        branch_id: "bkk-01",
        status: "open",
        invoice_id: "inv-001",
        amount: 1200,
        currency: "THB",
        issued_at: "2026-05-01T00:00:00.000Z",
        due_at: "2026-05-15T00:00:00.000Z",
      },
    ];
    store.items = [{ ou_id: "ou-001", branch_id: "bkk-01" }];
    jest.clearAllMocks();
  });

  it("enforces current role matrix across members, billing, dashboard", async () => {
    const app = createApp(env);
    const roles = ["owner", "admin", "manager", "member", "billing"];
    const expectations = {
      owner: { membersCreate: 201, billingPatch: 200, dashboard: 200 },
      admin: { membersCreate: 201, billingPatch: 200, dashboard: 200 },
      manager: { membersCreate: 201, billingPatch: 403, dashboard: 200 },
      member: { membersCreate: 403, billingPatch: 403, dashboard: 200 },
      billing: { membersCreate: 403, billingPatch: 403, dashboard: 200 },
    };

    for (const role of roles) {
      const headers = { ...baseHeaders, "x-user-role": role };
      const membersRes = await request(app)
        .post("/api/v1/ou/ou-001/branches/bkk-01/members")
        .set(headers)
        .send({
          username: `user-${role}`,
          password: "password123",
          displayName: `${role} user`,
          role: "member",
          status: "active",
        });

      expect(membersRes.status).toBe(expectations[role].membersCreate);

      const billingPatchRes = await request(app)
        .patch("/api/v1/ou/ou-001/branches/bkk-01/billing/plan")
        .set(headers)
        .send({ planCode: "growth" });
      expect(billingPatchRes.status).toBe(expectations[role].billingPatch);

      const dashboardRes = await request(app)
        .get("/api/v1/ou/ou-001/branches/bkk-01/dashboard/summary")
        .set(headers);
      expect(dashboardRes.status).toBe(expectations[role].dashboard);
    }
  });
});
