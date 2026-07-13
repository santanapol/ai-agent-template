import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { describe, it } from "node:test";

import {
  createInviteLinksRepository,
  mapInviteLinkDoc,
} from "./invite-links.repository.js";
import { createInviteLinksService } from "./invite-links.service.js";

describe("mapInviteLinkDoc", () => {
  it("maps MongoDB document to API shape", () => {
    const id = new ObjectId();
    const mapped = mapInviteLinkDoc({
      _id: id,
      invite_code: "3000001",
      username: "BERLIN",
      description: "line777ww7",
    });

    assert.deepEqual(mapped, {
      id: id.toString(),
      inviteCode: "3000001",
      username: "BERLIN",
      description: "line777ww7",
    });
  });
});

describe("createInviteLinksRepository", () => {
  it("queries su_staff_invite_link scoped by ou_id and branch_id sorted by invite_code", async () => {
    const ouId = new ObjectId();
    const branchId = new ObjectId();
    let capturedFilter;
    let capturedSort;

    const mockCollection = {
      find(filter) {
        capturedFilter = filter;
        return {
          sort(sort) {
            capturedSort = sort;
            return {
              async toArray() {
                return [
                  {
                    _id: new ObjectId(),
                    invite_code: "3000002",
                    username: "ZULU",
                    description: "z",
                  },
                  {
                    _id: new ObjectId(),
                    invite_code: "3000001",
                    username: "BERLIN",
                    description: "line777ww7",
                  },
                ];
              },
            };
          },
        };
      },
    };

    const getDb = () => ({
      collection(name) {
        assert.equal(name, "su_staff_invite_link");
        return mockCollection;
      },
    });

    const repository = createInviteLinksRepository(getDb);
    const { filter } = await repository.findByTenant({
      ouId: ouId.toString(),
      branchId: branchId.toString(),
    });

    assert.deepEqual(filter, {
      ou_id: ouId,
      branch_id: branchId,
    });
    assert.deepEqual(capturedFilter, filter);
    assert.deepEqual(capturedSort, { invite_code: 1 });
  });

  it("applies q regex escape, $or filter, and limit cap", async () => {
    const ouId = new ObjectId();
    const branchId = new ObjectId();
    let capturedLimit;

    const docs = [
      {
        _id: new ObjectId(),
        invite_code: "a.b",
        username: "match",
        description: "x",
      },
      {
        _id: new ObjectId(),
        invite_code: "other",
        username: "nomatch",
        description: "y",
      },
    ];

    const mockCollection = {
      find(filter) {
        return {
          sort() {
            return {
              limit(n) {
                capturedLimit = n;
                return {
                  async toArray() {
                    const q = filter.$or?.[0]?.invite_code;
                    const pattern = q?.source ?? "";
                    const regex = new RegExp(pattern, q?.flags ?? "i");
                    return docs
                      .filter((doc) => regex.test(doc.invite_code))
                      .slice(0, n);
                  },
                };
              },
            };
          },
        };
      },
    };

    const repository = createInviteLinksRepository(() => ({
      collection: () => mockCollection,
    }));

    const { filter } = await repository.findByTenant({
      ouId: ouId.toString(),
      branchId: branchId.toString(),
      q: "a.b",
      limit: 200,
    });

    assert.ok(filter.$or);
    assert.equal(filter.$or[0].invite_code.source, "a\\.b");
    assert.equal(capturedLimit, 100);
  });

  it("rejects invalid tenant ObjectIds", async () => {
    const repository = createInviteLinksRepository(() => ({
      collection() {
        throw new Error("should not query");
      },
    }));

    await assert.rejects(
      () =>
        repository.findByTenant({
          ouId: "not-valid",
          branchId: new ObjectId().toString(),
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, "INVALID_PARAM");
        return true;
      },
    );
  });

  it("existsForTenant returns true when invite link belongs to tenant", async () => {
    const ouId = new ObjectId();
    const branchId = new ObjectId();
    const inviteLinkId = new ObjectId();
    let capturedFilter;

    const getDb = () => ({
      collection(name) {
        assert.equal(name, "su_staff_invite_link");
        return {
          async findOne(filter) {
            capturedFilter = filter;
            return { _id: inviteLinkId };
          },
        };
      },
    });

    const repository = createInviteLinksRepository(getDb);
    const exists = await repository.existsForTenant({
      ouId: ouId.toString(),
      branchId: branchId.toString(),
      inviteLinkId: inviteLinkId.toString(),
    });

    assert.equal(exists, true);
    assert.deepEqual(capturedFilter, {
      ou_id: ouId,
      branch_id: branchId,
      _id: inviteLinkId,
    });
  });

  it("existsForTenant returns false when invite link is missing", async () => {
    const getDb = () => ({
      collection() {
        return {
          async findOne() {
            return null;
          },
        };
      },
    });

    const repository = createInviteLinksRepository(getDb);
    const exists = await repository.existsForTenant({
      ouId: new ObjectId().toString(),
      branchId: new ObjectId().toString(),
      inviteLinkId: new ObjectId().toString(),
    });

    assert.equal(exists, false);
  });
});

describe("createInviteLinksService", () => {
  it("returns mapped invite links from repository", async () => {
    const id = new ObjectId();
    const repository = {
      async findByTenant() {
        return {
          filter: {},
          docs: [
            {
              _id: id,
              invite_code: "3000001",
              username: "BERLIN",
              description: "line777ww7",
            },
          ],
        };
      },
    };

    const service = createInviteLinksService(repository);
    const result = await service.listInviteLinks({
      ouId: new ObjectId().toString(),
      branchId: new ObjectId().toString(),
    });

    assert.deepEqual(result, [
      {
        id: id.toString(),
        inviteCode: "3000001",
        username: "BERLIN",
        description: "line777ww7",
      },
    ]);
  });
});
