import test from "node:test";
import assert from "node:assert";
import * as service from "../agents.service.js";
import { ObjectId } from "mongodb";

const createMockDb = (overrides = {}) => {
  const defaultCollection = {
    find: () => ({
      skip: () => ({
        limit: () => ({
          toArray: async () => [{ _id: "123", branch_name: "Test Branch" }],
        }),
      }),
    }),
    aggregate: () => ({
      toArray: async () => [{ _id: "123", branch_name: "Test Branch" }],
    }),
    countDocuments: async () => 1,
    insertOne: async () => ({ insertedId: new ObjectId() }),
    updateOne: async () => ({ matchedCount: 1 }),
    findOne: async () => ({ _id: "123", branch_name: "Test Branch" }),
  };

  return {
    collection: (name) => {
      if (overrides[name]) return { ...defaultCollection, ...overrides[name] };
      return defaultCollection;
    },
  };
};

test("getAgents should return agents and total from repository", async () => {
  const dbMock = createMockDb();
  const result = await service.getAgents(
    dbMock,
    "000000000000000000000123",
    "search term",
    1,
    10,
  );
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.agents.length, 1);
  assert.strictEqual(result.agents[0].branch_name, "Test Branch");
});

test("createAgent should success if default_fee_rate is provided", async () => {
  let insertCalled = false;
  const dbMock = createMockDb({
    agents: {
      insertOne: async () => {
        insertCalled = true;
        return { insertedId: new ObjectId() };
      },
    },
  });

  const payload = {
    branch_name: "Has Fee",
    default_fee_rate: 10,
  };

  const result = await service.createAgent(
    dbMock,
    "000000000000000000000123",
    payload,
    "user1",
  );
  assert.strictEqual(insertCalled, true);
  assert.ok(result.insertedId);
  assert.ok(result.upd_date);
});

test("updateAgent should throw 412 if matchedCount is 0", async () => {
  const dbMock = createMockDb({
    agents: {
      updateOne: async () => ({ matchedCount: 0 }),
    },
  });

  const payload = {
    default_fee_rate: 5,
  };

  await assert.rejects(
    async () => {
      await service.updateAgent(
        dbMock,
        "000000000000000000000000",
        "000000000000000000000123",
        payload,
        new Date().toISOString(),
        "user1",
      );
    },
    (err) => {
      assert.strictEqual(err.statusCode, 412);
      return true;
    },
  );
});

test("softDeleteAgent should throw 412 if matchedCount is 0", async () => {
  const dbMock = createMockDb({
    agents: {
      updateOne: async () => ({ matchedCount: 0 }),
    },
  });

  await assert.rejects(
    async () => {
      await service.softDeleteAgent(
        dbMock,
        "000000000000000000000000",
        "000000000000000000000123",
        new Date().toISOString(),
        "user1",
      );
    },
    (err) => {
      assert.strictEqual(err.statusCode, 412);
      return true;
    },
  );
});

test("getAgentDetail should return the agent when found", async () => {
  const mockAgent = {
    _id: "123",
    branch_name: "Found Branch",
    upd_date: new Date(),
  };
  const dbMock = createMockDb({
    agents: {
      findOne: async () => mockAgent,
    },
  });

  const result = await service.getAgentDetail(
    dbMock,
    "000000000000000000000123",
    "000000000000000000000456",
  );

  assert.strictEqual(result._id, "123");
  assert.strictEqual(result.branch_name, "Found Branch");
});

test("getAgentDetail should throw 404 when agent is not found", async () => {
  const dbMock = createMockDb({
    agents: {
      findOne: async () => null,
    },
  });

  await assert.rejects(
    async () =>
      service.getAgentDetail(
        dbMock,
        "000000000000000000000000",
        "000000000000000000000123",
      ),
    (err) => {
      assert.strictEqual(err.statusCode, 404);
      return true;
    },
  );
});

test("resolveAgentBranchId should return agent branch_id when found", async () => {
  const mockBranchId = new ObjectId("000000000000000000000099");
  const mockAgent = {
    _id: new ObjectId("000000000000000000000123"),
    branch_id: mockBranchId,
    upd_date: new Date(),
  };
  const dbMock = createMockDb({
    agents: {
      findOne: async () => mockAgent,
    },
  });

  const result = await service.resolveAgentBranchId(
    dbMock,
    "000000000000000000000123",
    "000000000000000000000456",
  );
  assert.deepStrictEqual(result, mockBranchId);
});

test("resolveAgentBranchId should throw 404 when agent is not found", async () => {
  const dbMock = createMockDb({
    agents: {
      findOne: async () => null,
    },
  });

  await assert.rejects(
    async () =>
      service.resolveAgentBranchId(
        dbMock,
        "000000000000000000000000",
        "000000000000000000000123",
      ),
    (err) => {
      assert.strictEqual(err.statusCode, 404);
      return true;
    },
  );
});

test("syncAgent — queries su_branch from read database", async () => {
  const branchId = "665a3d76b1e5f8b9e6f2b3d1";
  const ouId = "000000000000000000000456";
  let sourceQueried = false;

  const sourceDbMock = {
    collection: (name) => {
      if (name === "su_branch") {
        return {
          findOne: async () => {
            sourceQueried = true;
            return {
              _id: new ObjectId(branchId),
              ou_id: ouId,
              branch_code: "SRC01",
              branch_name: "Source Branch",
              branch_type: "AG",
              currency: "THB",
            };
          },
        };
      }
      return { findOne: async () => null };
    },
  };

  const dbMock = createMockDb({
    agents: {
      findOne: async () => null,
      insertOne: async () => ({ insertedId: new ObjectId() }),
    },
  });

  await service.syncAgent(dbMock, ouId, branchId, "user1", sourceDbMock);
  assert.strictEqual(
    sourceQueried,
    true,
    "read database should query su_branch",
  );
});

test("getUnsyncedBranches — queries su_branch from read database", async () => {
  let sourceQueried = false;

  const sourceDbMock = {
    collection: (name) => {
      if (name === "su_branch") {
        return {
          find: () => ({
            project: () => ({
              sort: () => ({
                toArray: async () => {
                  sourceQueried = true;
                  return [];
                },
              }),
            }),
          }),
        };
      }
      return {
        find: () => ({
          project: () => ({ sort: () => ({ toArray: async () => [] }) }),
        }),
      };
    },
  };

  const dbMock = createMockDb({
    agents: {
      find: () => ({
        project: () => ({
          toArray: async () => [],
        }),
      }),
    },
  });

  await service.getUnsyncedBranches(
    dbMock,
    "000000000000000000000456",
    false,
    sourceDbMock,
  );
  assert.strictEqual(
    sourceQueried,
    true,
    "read database should query su_branch",
  );
});

test("syncAgent — passes ou_id to the su_branch findOne filter", async () => {
  const branchId = "665a3d76b1e5f8b9e6f2b3d1";
  const ouId = "000000000000000000000456";
  let capturedFilter;

  const sourceDbMock = {
    collection: () => ({
      findOne: async (filter) => {
        capturedFilter = filter;
        return null; // returns null → throws 404, which is fine for this assertion
      },
    }),
  };

  const dbMock = createMockDb();

  // Ignore the 404 — we only care about what filter was passed
  await service
    .syncAgent(dbMock, ouId, branchId, "user1", sourceDbMock)
    .catch(() => {});

  assert.ok(
    capturedFilter.ou_id,
    "findOne filter must include ou_id to prevent cross-tenant sync",
  );
  assert.strictEqual(
    String(capturedFilter.ou_id),
    ouId,
    "ou_id in filter must match the requester org",
  );
});

test("getUnsyncedBranches — scopes su_branch query to requester ou_id", async () => {
  const ouId = "000000000000000000000456";
  let capturedQuery;

  const sourceDbMock = {
    collection: (_name) => ({
      find: (query) => {
        capturedQuery = query;
        return {
          project: () => ({ sort: () => ({ toArray: async () => [] }) }),
        };
      },
    }),
  };

  const dbMock = createMockDb({
    agents: {
      find: () => ({ project: () => ({ toArray: async () => [] }) }),
    },
  });

  await service.getUnsyncedBranches(dbMock, ouId, false, sourceDbMock);

  assert.ok(capturedQuery.ou_id, "su_branch query must include ou_id");
  assert.strictEqual(
    String(capturedQuery.ou_id),
    ouId,
    "ou_id in query must match the requester ou_id",
  );
});
