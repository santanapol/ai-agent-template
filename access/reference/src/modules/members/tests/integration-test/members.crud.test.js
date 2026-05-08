"use strict";

const request = require("supertest");
const createApp = require("../../../../app");

const state = {
  members: [],
};

function clone(doc) {
  return { ...doc };
}

function matchFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => doc[key] === value);
}

function mockBuildMembersCollection() {
  return {
    countDocuments: async (filter) =>
      state.members.filter((doc) => matchFilter(doc, filter)).length,
    find: (filter) => {
      const docs = state.members.filter((doc) => matchFilter(doc, filter));
      return {
        sort: () => ({
          skip: (skip) => ({
            limit: (limit) => ({
              toArray: async () =>
                docs.slice(skip, skip + limit).map((doc) => clone(doc)),
            }),
          }),
        }),
      };
    },
    insertOne: async (doc) => {
      state.members.push(clone(doc));
      return { acknowledged: true };
    },
    findOneAndUpdate: async (filter, update) => {
      const index = state.members.findIndex((doc) => matchFilter(doc, filter));
      if (index < 0) return null;
      state.members[index] = {
        ...state.members[index],
        ...update.$set,
      };
      return clone(state.members[index]);
    },
    deleteOne: async (filter) => {
      const index = state.members.findIndex((doc) => matchFilter(doc, filter));
      if (index < 0) return { deletedCount: 0 };
      state.members.splice(index, 1);
      return { deletedCount: 1 };
    },
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn((name) => {
      if (name === "members") return mockBuildMembersCollection();
      return {
        countDocuments: async () => 0,
        find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }),
      };
    }),
  })),
}));

describe("reference members CRUD", () => {
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
  const basePath = "/api/v1/ou/ou-001/branches/bkk-01/members";

  beforeEach(() => {
    state.members = [];
    jest.clearAllMocks();
  });

  it("allows manager to create/list/update/remove members in own branch", async () => {
    const app = createApp(env);
    const managerHeaders = { ...baseHeaders, "x-user-role": "manager" };

    const createRes = await request(app).post(basePath).set(managerHeaders).send({
      username: "member01",
      password: "password123",
      displayName: "Member One",
      email: "member01@example.com",
      role: "member",
      status: "active",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.username).toBe("member01");

    const userId = createRes.body.data.userId;
    const listRes = await request(app).get(basePath).set(managerHeaders);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`${basePath}/${userId}`)
      .set(managerHeaders)
      .send({ displayName: "Member One Updated" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.displayName).toBe("Member One Updated");

    const deleteRes = await request(app)
      .delete(`${basePath}/${userId}`)
      .set(managerHeaders);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });

  it("rejects member role from managing members", async () => {
    const app = createApp(env);
    const res = await request(app).post(basePath).set({
      ...baseHeaders,
      "x-user-role": "member",
    }).send({
      username: "member02",
      password: "password123",
      displayName: "Member Two",
      role: "member",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("INVALID_USER_CONTEXT");
  });

  it("rejects manager when path branch mismatches caller branch", async () => {
    const app = createApp(env);
    const res = await request(app)
      .get("/api/v1/ou/ou-001/branches/cnx-01/members")
      .set({
        ...baseHeaders,
        "x-user-role": "manager",
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("INVALID_USER_CONTEXT");
  });
});
