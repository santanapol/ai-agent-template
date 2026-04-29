"use strict";

const request = require("supertest");
const { ObjectId } = require("mongodb");
const createApp = require("../../../../app");
const { encodeEtagFromDate } = require("../../../../utils/etag");

const state = {
  docs: [],
};
const DEFAULT_SEED_DATE = new Date("2026-04-20T10:00:00.000Z");

function clone(doc) {
  return {
    ...doc,
    tags: [...(doc.tags || [])],
  };
}

function matchFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "_id") {
      return doc._id.toString() === value.toString();
    }
    if (value instanceof Date) {
      return doc[key] instanceof Date && doc[key].getTime() === value.getTime();
    }
    return doc[key] === value;
  });
}

function applySort(docs, sort) {
  const [[key, order]] = Object.entries(sort);
  return docs.sort((left, right) => {
    const leftRaw = left[key];
    const rightRaw = right[key];
    const leftValue =
      leftRaw &&
      typeof leftRaw === "object" &&
      typeof leftRaw.toString === "function"
        ? leftRaw.toString()
        : leftRaw;
    const rightValue =
      rightRaw &&
      typeof rightRaw === "object" &&
      typeof rightRaw.toString === "function"
        ? rightRaw.toString()
        : rightRaw;
    if (leftValue < rightValue) {
      return order;
    }
    if (leftValue > rightValue) {
      return -order;
    }
    return 0;
  });
}

function seedItemDoc(overrides = {}) {
  const seedId = overrides._id ?? new ObjectId();
  const seedDate = overrides.upd_date ?? DEFAULT_SEED_DATE;
  const doc = {
    _id: seedId,
    ou_id: "ou-001",
    branch_id: "bkk-01",
    code: "ITEM-002",
    name: "Before",
    description: null,
    status: "draft",
    tags: [],
    cr_by: "user-001",
    cr_date: seedDate,
    cr_prog: "/api/v1/items",
    upd_by: "user-001",
    upd_date: seedDate,
    upd_prog: "/api/v1/items",
    ...overrides,
  };
  doc._id = seedId;
  doc.upd_date = seedDate;
  return doc;
}

function buildCursor(sorted, totalDocs) {
  let skipped = 0;
  let limited = totalDocs;

  return {
    skip: (skip) => {
      skipped = skip;
      return {
        limit: (limit) => {
          limited = limit;
          return {
            toArray: async () =>
              sorted.slice(skipped, skipped + limited).map((doc) => clone(doc)),
          };
        },
      };
    },
  };
}

function mockCreateCollection() {
  return {
    insertOne: async (doc) => {
      state.docs.push(clone(doc));
      return { acknowledged: true };
    },
    countDocuments: async (filter) =>
      state.docs.filter((doc) => matchFilter(doc, filter)).length,
    find: (filter) => {
      const docs = state.docs.filter((doc) => matchFilter(doc, filter));
      let sorted = [...docs];
      return {
        sort: (sort) => {
          sorted = applySort([...docs], sort);
          return buildCursor(sorted, docs.length);
        },
      };
    },
    findOne: async (filter) => {
      const doc = state.docs.find((entry) => matchFilter(entry, filter));
      return doc ? clone(doc) : null;
    },
    replaceOne: async (filter, replacement) => {
      const index = state.docs.findIndex((doc) => matchFilter(doc, filter));
      if (index < 0) {
        return { matchedCount: 0 };
      }
      const previous = state.docs[index];
      state.docs[index] = {
        ...clone(replacement),
        cr_by: previous.cr_by,
        cr_date: previous.cr_date,
        cr_prog: previous.cr_prog,
      };
      return { matchedCount: 1 };
    },
    findOneAndUpdate: async (filter, update) => {
      const index = state.docs.findIndex((doc) => matchFilter(doc, filter));
      if (index < 0) {
        return null;
      }
      state.docs[index] = {
        ...state.docs[index],
        ...update.$set,
      };
      return clone(state.docs[index]);
    },
    deleteOne: async (filter) => {
      const index = state.docs.findIndex((doc) => matchFilter(doc, filter));
      if (index < 0) {
        return { deletedCount: 0 };
      }
      state.docs.splice(index, 1);
      return { deletedCount: 1 };
    },
  };
}

jest.mock("../../../../config/database", () => ({
  pingDatabase: jest.fn(async () => {}),
  getDatabase: jest.fn(() => ({
    collection: jest.fn(() => mockCreateCollection()),
  })),
}));

const { pingDatabase } = require("../../../../config/database");

describe("reference items CRUD", () => {
  const env = {
    gatewaySharedSecret: "secret-123",
    bodyLimit: "1mb",
    requestTimeoutMs: 30000,
    shutdownTimeoutMs: 10000,
  };
  const requiredHeaders = {
    "x-gateway-secret": "secret-123",
    "x-user-id": "user-001",
    "x-user-ou": "ou-001",
    "x-user-branch": "bkk-01",
  };
  let app;

  beforeEach(() => {
    state.docs = [];
    jest.clearAllMocks();
    app = createApp(env);
  });

  it("returns liveness from /healthz", async () => {
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns readiness from /readyz when db is ready", async () => {
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ready");
  });

  it("returns 503 from /readyz when db is unavailable", async () => {
    pingDatabase.mockImplementationOnce(async () => {
      throw new Error("down");
    });
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("SERVICE_UNAVAILABLE");
    expect(response.body.data).toBeNull();
  });

  it("returns 401 from /metrics without gateway secret", async () => {
    const response = await request(app).get("/metrics");
    expect(response.status).toBe(401);
  });

  it("returns prometheus text from /metrics with gateway secret", async () => {
    const response = await request(app)
      .get("/metrics")
      .set("x-gateway-secret", "secret-123");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/plain/);
    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("http_request_duration_ms");
  });

  it("rejects missing user headers on CRUD route", async () => {
    const response = await request(app)
      .get("/api/v1/items")
      .set("x-gateway-secret", "secret-123");
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("MISSING_GATEWAY_USER_CONTEXT");
  });

  it("rejects unsupported accept header on CRUD route", async () => {
    const response = await request(app)
      .get("/api/v1/items")
      .set(requiredHeaders)
      .set("accept", "application/xml");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_HEADER");
  });

  it("supports create/list/detail lifecycle", async () => {
    const createResponse = await request(app)
      .post("/api/v1/items")
      .set(requiredHeaders)
      .set("content-type", "application/json")
      .send({
        code: "ITEM-001",
        name: "Sample Item",
        description: "Example item",
        status: "active",
        tags: ["sample"],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.location).toContain("/api/v1/items/");
    expect(createResponse.headers.etag).toBeDefined();
    expect(createResponse.body.data.code).toBe("ITEM-001");

    const listResponse = await request(app)
      .get("/api/v1/items")
      .set(requiredHeaders);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.pagination.total).toBe(1);

    const itemId = createResponse.body.data.id;
    const detailResponse = await request(app)
      .get(`/api/v1/items/${itemId}`)
      .set(requiredHeaders);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.id).toBe(itemId);
  });

  it("supports patch and delete with If-Match", async () => {
    const seedId = new ObjectId();
    const seedDate = new Date("2026-04-20T10:00:00.000Z");
    state.docs.push(
      seedItemDoc({
        _id: seedId,
        upd_date: seedDate,
        code: "ITEM-002",
        name: "Before",
      }),
    );

    const ifMatch = encodeEtagFromDate(seedDate);
    const patchResponse = await request(app)
      .patch(`/api/v1/items/${seedId.toString()}`)
      .set(requiredHeaders)
      .set("if-match", ifMatch)
      .set("content-type", "application/json")
      .send({ name: "After" });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data.name).toBe("After");
    const nextEtag = patchResponse.headers.etag;
    expect(nextEtag).toBeDefined();

    const deleteResponse = await request(app)
      .delete(`/api/v1/items/${seedId.toString()}`)
      .set(requiredHeaders)
      .set("if-match", nextEtag);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.deleted).toBe(true);
  });

  it("returns 412 when If-Match is malformed", async () => {
    const seedId = new ObjectId();
    const seedDate = new Date("2026-04-20T10:00:00.000Z");
    state.docs.push(
      seedItemDoc({
        _id: seedId,
        upd_date: seedDate,
        code: "ITEM-003",
        name: "Seed Item",
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/items/${seedId.toString()}`)
      .set(requiredHeaders)
      .set("if-match", 'W/"not-a-valid-etag"')
      .set("content-type", "application/json")
      .send({ name: "Updated Item" });

    expect(response.status).toBe(412);
    expect(response.body.code).toBe("VERSION_CONFLICT");
  });

  it("enforces stricter write rate limit tier (30/min)", async () => {
    const statuses = [];

    for (let index = 0; index < 31; index += 1) {
      const response = await request(app)
        .post("/api/v1/items")
        .set(requiredHeaders)
        .set("content-type", "application/json")
        .send({
          code: `ITEM-${String(index).padStart(3, "0")}`,
          name: `Item ${index}`,
          description: null,
          status: "active",
          tags: [],
        });
      statuses.push(response.status);
    }

    expect(statuses[29]).toBe(201);
    expect(statuses[30]).toBe(429);
  });
});
