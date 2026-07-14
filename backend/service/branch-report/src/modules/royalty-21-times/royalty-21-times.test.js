import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { describe, it } from "node:test";

import { createRoyalty21TimesService } from "./royalty-21-times.service.js";

const userContext = {
  ouId: "507f1f77bcf86cd799439011",
  branchId: "507f1f77bcf86cd799439012",
};

describe("createRoyalty21TimesService", () => {
  it("maps members and metrics into report rows", async () => {
    const memId = new ObjectId();
    const regDate = new Date("2024-06-15T10:30:00Z");

    const repository = {
      async findMembersPage() {
        return {
          members: [{ _id: memId, username: "7W001", reg_date: regDate }],
        };
      },
      async countMembers() {
        return { total: 1 };
      },
      async fetchMemberMetrics() {
        return new Map([
          [
            memId.toString(),
            {
              billin: 15000,
              withdraw: 5000,
              promotion: 1200,
              revenue: 10000,
              deposits: [100, 200, 500, ...Array(18).fill(0)],
            },
          ],
        ]);
      },
    };

    const inviteLinksRepository = {
      async existsForTenant() {
        return true;
      },
    };

    const referringMembersRepository = {
      async existsAsReferrerForTenant() {
        return true;
      },
      async findReferrerByExactUsername() {
        return {
          doc: {
            _id: new ObjectId("507f1f77bcf86cd799439014"),
            username: "REFERRER01",
          },
        };
      },
    };

    const service = createRoyalty21TimesService(
      repository,
      inviteLinksRepository,
      referringMembersRepository,
    );
    const result = await service.getReport({
      userContext,
      query: {
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
        page: 1,
        pageSize: 50,
      },
    });

    assert.equal(result.pagination.total, 1);
    assert.deepEqual(result.data, [
      {
        username: "7W001",
        register: "15/06/2024",
        billin: 15000,
        withdraw: 5000,
        promotion: 1200,
        revenue: 10000,
        deposits: [100, 200, 500, ...Array(18).fill(0)],
      },
    ]);
  });

  it("returns deposit matrix from repository without pagination", async () => {
    const matrix = {
      buckets: [{ key: "0-99", label: "0 - 99", min: 0, max: 99 }],
      rounds: 21,
      counts: [[1]],
      rowSums: [1],
      percents: [[100]],
      percentRowSums: [100],
    };

    const repository = {
      async findDepositMatrix() {
        return matrix;
      },
    };

    const inviteLinksRepository = {
      async existsForTenant() {
        return true;
      },
    };

    const referringMembersRepository = {
      async findReferrerByExactUsername() {
        return {
          doc: {
            _id: new ObjectId("507f1f77bcf86cd799439014"),
            username: "REFERRER01",
          },
        };
      },
    };

    const service = createRoyalty21TimesService(
      repository,
      inviteLinksRepository,
      referringMembersRepository,
    );
    const result = await service.getDepositMatrix({
      userContext,
      query: {
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      },
    });

    assert.deepEqual(result, matrix);
    assert.equal("pagination" in result, false);
  });

  it("requires referralUsername for member_referral deposit matrix", async () => {
    const repository = {
      async findDepositMatrix() {
        throw new Error("should not query matrix");
      },
    };
    const service = createRoyalty21TimesService(
      repository,
      {
        async existsForTenant() {
          return true;
        },
      },
      {
        async findReferrerByExactUsername() {
          return { doc: null };
        },
      },
    );

    await assert.rejects(
      () =>
        service.getDepositMatrix({
          userContext,
          query: {
            channelType: "member_referral",
            regDateFrom: "2024-06-01",
            regDateTo: "2024-06-30",
          },
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, "INVALID_PARAM");
        assert.match(error.message, /referralUsername/i);
        return true;
      },
    );
  });

  it("rejects unknown referring member username for deposit matrix", async () => {
    const repository = {
      async findDepositMatrix() {
        throw new Error("should not query matrix");
      },
    };
    const service = createRoyalty21TimesService(
      repository,
      {
        async existsForTenant() {
          return true;
        },
      },
      {
        async findReferrerByExactUsername() {
          return { doc: null };
        },
      },
    );

    await assert.rejects(
      () =>
        service.getDepositMatrix({
          userContext,
          query: {
            channelType: "member_referral",
            referralUsername: "NO_SUCH_USER",
            regDateFrom: "2024-06-01",
            regDateTo: "2024-06-30",
          },
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /not found/i);
        return true;
      },
    );
  });

  it("passes resolved referralUid into findDepositMatrix channelFilter", async () => {
    const referralUid = "507f1f77bcf86cd799439014";
    /** @type {unknown} */
    let capturedFilter;

    const repository = {
      async findDepositMatrix(input) {
        capturedFilter = input.channelFilter;
        return {
          buckets: [],
          rounds: 21,
          counts: [],
          rowSums: [],
          percents: [],
          percentRowSums: [],
        };
      },
    };

    const service = createRoyalty21TimesService(
      repository,
      {
        async existsForTenant() {
          return true;
        },
      },
      {
        async findReferrerByExactUsername() {
          return {
            doc: { _id: new ObjectId(referralUid), username: "REFERRER01" },
          };
        },
      },
    );

    await service.getDepositMatrix({
      userContext,
      query: {
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-06-01",
        regDateTo: "2024-06-30",
      },
    });

    assert.deepEqual(capturedFilter, {
      channelType: "member_referral",
      inviteLinkId: undefined,
      referralUid,
      regDateFrom: "2024-06-01",
      regDateTo: "2024-06-30",
    });
  });
});
