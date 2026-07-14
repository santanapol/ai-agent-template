import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { describe, it } from "node:test";

import {
  DEPOSIT_SUCCESS_STATUS,
  PROMOTION_MODULES,
  PROMOTION_SUCCESS_STATUS,
  WITHDRAW_SUCCESS_STATUS,
} from "../../lib/constants.js";
import { AMOUNT_BUCKETS } from "../../lib/deposit-matrix.js";
import { createRoyalty21TimesRepository } from "./royalty-21-times.repository.js";

const OU_ID = "507f1f77bcf86cd799439011";
const BRANCH_ID = "507f1f77bcf86cd799439012";
const INVITE_LINK_ID = "507f1f77bcf86cd799439013";

const REG_FROM = "2024-06-01";
const REG_TO = "2024-06-30";

const defaultChannelFilter = {
  channelType: "member_referral",
  referralUid: "507f1f77bcf86cd799439014",
  regDateFrom: REG_FROM,
  regDateTo: REG_TO,
};

const regDateBounds = {
  reg_date: {
    $gte: new Date(`${REG_FROM}T00:00:00.000Z`),
    $lte: new Date(`${REG_TO}T23:59:59.999Z`),
  },
};

const userContext = {
  ouId: OU_ID,
  branchId: BRANCH_ID,
};

function createMockDb() {
  const state = {
    findFilter: null,
    findSort: null,
    findSkip: null,
    findLimit: null,
    findProject: null,
    countFilter: null,
    members: [],
    total: 0,
  };

  const collection = {
    find(filter) {
      state.findFilter = filter;
      return {
        sort(sort) {
          state.findSort = sort;
          return {
            skip(value) {
              state.findSkip = value;
              return {
                limit(value) {
                  state.findLimit = value;
                  return {
                    project(projection) {
                      state.findProject = projection;
                      return {
                        async toArray() {
                          return state.members;
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    async countDocuments(filter) {
      state.countFilter = filter;
      return state.total;
    },
  };

  const getDb = () => ({
    collection(name) {
      assert.equal(name, "member");
      return collection;
    },
  });

  return { getDb, state };
}

describe("createRoyalty21TimesRepository — members (T6a)", () => {
  it("findMembersPage returns projected members sorted by username ASC", async () => {
    const memId = new ObjectId();
    const regDate = new Date("2024-06-15T10:30:00Z");
    const { getDb, state } = createMockDb();
    state.members = [{ _id: memId, username: "7W001", reg_date: regDate }];

    const repository = createRoyalty21TimesRepository(getDb);
    const { members, filter } = await repository.findMembersPage({
      userContext,
      channelFilter: {
        channelType: "affiliate_link",
        inviteLinkId: INVITE_LINK_ID,
        regDateFrom: REG_FROM,
        regDateTo: REG_TO,
      },
      page: 2,
      pageSize: 20,
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral_staff_link_id: new ObjectId(INVITE_LINK_ID),
      ...regDateBounds,
    });
    assert.deepEqual(state.findFilter, filter);
    assert.deepEqual(state.findSort, { username: 1 });
    assert.equal(state.findSkip, 20);
    assert.equal(state.findLimit, 20);
    assert.deepEqual(state.findProject, { _id: 1, username: 1, reg_date: 1 });
    assert.deepEqual(members, state.members);
  });

  it("countMembers returns total for the same tenant-scoped filter", async () => {
    const { getDb, state } = createMockDb();
    state.total = 42;

    const repository = createRoyalty21TimesRepository(getDb);
    const { total, filter } = await repository.countMembers({
      userContext,
      channelFilter: defaultChannelFilter,
    });

    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: "Member",
      referral_uid: new ObjectId("507f1f77bcf86cd799439014"),
      ...regDateBounds,
    });
    assert.deepEqual(state.countFilter, filter);
    assert.equal(total, 42);
  });

  it("scopes direct channel members by referral Branch", async () => {
    const { getDb, state } = createMockDb();
    state.members = [];

    const repository = createRoyalty21TimesRepository(getDb);
    await repository.findMembersPage({
      userContext,
      channelFilter: {
        channelType: "direct",
        regDateFrom: REG_FROM,
        regDateTo: REG_TO,
      },
      page: 1,
      pageSize: 50,
    });

    assert.deepEqual(state.findFilter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: "Branch",
      ...regDateBounds,
    });
  });
});

function createMetricsMockDb({
  billinRows = [],
  withdrawRows = [],
  depositRows = [],
  promotionRows = [],
} = {}) {
  const state = {
    aggregateCalls: [],
  };

  const depositCollection = {
    aggregate(pipeline) {
      state.aggregateCalls.push({
        collection: "dm_dm_tn_deposit",
        pipeline,
      });

      const isBillinPipeline = pipeline.some(
        (stage) => stage.$group && stage.$group.billin,
      );
      const rows = isBillinPipeline ? billinRows : depositRows;

      return {
        async toArray() {
          return rows;
        },
      };
    },
  };

  const withdrawCollection = {
    aggregate(pipeline) {
      state.aggregateCalls.push({
        collection: "wallet_withdraw",
        pipeline,
      });

      return {
        async toArray() {
          return withdrawRows;
        },
      };
    },
  };

  const promotionCollection = {
    aggregate(pipeline) {
      state.aggregateCalls.push({
        collection: "promotion_receive",
        pipeline,
      });

      return {
        async toArray() {
          return promotionRows;
        },
      };
    },
  };

  const getDb = () => ({
    collection(name) {
      if (name === "dm_dm_tn_deposit") {
        return depositCollection;
      }
      if (name === "wallet_withdraw") {
        return withdrawCollection;
      }
      if (name === "promotion_receive") {
        return promotionCollection;
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  });

  return { getDb, state };
}

describe("createRoyalty21TimesRepository — metrics (T6b)", () => {
  it("returns metrics map with billin, withdraw, promotion, deposits, and revenue", async () => {
    const memId = new ObjectId();
    const { getDb } = createMetricsMockDb({
      billinRows: [{ _id: memId, billin: 15000 }],
      withdrawRows: [{ _id: memId, withdraw: 5000 }],
      depositRows: [{ _id: memId, deposits: [100, 200, 500] }],
      promotionRows: [{ _id: memId, promotion: 1200 }],
    });

    const repository = createRoyalty21TimesRepository(getDb);
    const metricsByMemId = await repository.fetchMemberMetrics({
      userContext,
      memIds: [memId],
    });

    const metrics = metricsByMemId.get(memId.toString());
    assert.equal(metrics.billin, 15000);
    assert.equal(metrics.withdraw, 5000);
    assert.equal(metrics.promotion, 1200);
    assert.equal(metrics.revenue, 10000);
    assert.deepEqual(metrics.deposits.slice(0, 3), [100, 200, 500]);
    assert.equal(metrics.deposits[3], 0);
    assert.equal(metrics.deposits.length, 21);
  });

  it("runs four bulk aggregations across deposit, withdraw, and promotion collections", async () => {
    const memId = new ObjectId();
    const { getDb, state } = createMetricsMockDb({
      billinRows: [],
      withdrawRows: [],
      depositRows: [],
      promotionRows: [],
    });

    const repository = createRoyalty21TimesRepository(getDb);
    await repository.fetchMemberMetrics({
      userContext,
      memIds: [memId],
    });

    assert.equal(state.aggregateCalls.length, 4);
    assert.equal(
      state.aggregateCalls.filter(
        (call) => call.collection === "dm_dm_tn_deposit",
      ).length,
      2,
    );
    assert.equal(
      state.aggregateCalls.filter(
        (call) => call.collection === "wallet_withdraw",
      ).length,
      1,
    );
    assert.equal(
      state.aggregateCalls.filter(
        (call) => call.collection === "promotion_receive",
      ).length,
      1,
    );
  });

  it("scopes bulk aggregations by ou_id, branch_id, and mem_id/uid $in", async () => {
    const memId = new ObjectId();
    const { getDb, state } = createMetricsMockDb();

    const repository = createRoyalty21TimesRepository(getDb);
    await repository.fetchMemberMetrics({
      userContext,
      memIds: [memId],
    });

    const depositMatch = state.aggregateCalls.find(
      (call) =>
        call.collection === "dm_dm_tn_deposit" &&
        call.pipeline[0]?.$match?.status?.$in,
    )?.pipeline[0].$match;

    const withdrawMatch = state.aggregateCalls.find(
      (call) => call.collection === "wallet_withdraw",
    )?.pipeline[0].$match;

    const promotionMatch = state.aggregateCalls.find(
      (call) => call.collection === "promotion_receive",
    )?.pipeline[0].$match;

    assert.deepEqual(depositMatch, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      mem_id: { $in: [memId] },
      status: { $in: DEPOSIT_SUCCESS_STATUS },
    });
    assert.deepEqual(withdrawMatch, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      uid: { $in: [memId] },
      wd_status: WITHDRAW_SUCCESS_STATUS,
    });
    assert.deepEqual(promotionMatch, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      uid: { $in: [memId] },
      status: PROMOTION_SUCCESS_STATUS,
      module: { $in: PROMOTION_MODULES },
    });
  });

  it("projects promotion as round(bonus_amt - accrued_expense)", async () => {
    const memId = new ObjectId();
    const { getDb, state } = createMetricsMockDb();

    const repository = createRoyalty21TimesRepository(getDb);
    await repository.fetchMemberMetrics({
      userContext,
      memIds: [memId],
    });

    const promotionPipeline = state.aggregateCalls.find(
      (call) => call.collection === "promotion_receive",
    )?.pipeline;

    assert.deepEqual(promotionPipeline?.[1]?.$group, {
      _id: "$uid",
      pro_amt: { $sum: "$bonus_amt" },
      pro_accrued: { $sum: "$accrued_expense" },
    });
    assert.deepEqual(promotionPipeline?.[2]?.$project, {
      promotion: {
        $round: [{ $subtract: ["$pro_amt", "$pro_accrued"] }, 0],
      },
    });
  });

  it("sorts deposit slots by bill_date ASC in aggregation pipeline", async () => {
    const memId = new ObjectId();
    const { getDb, state } = createMetricsMockDb();

    const repository = createRoyalty21TimesRepository(getDb);
    await repository.fetchMemberMetrics({
      userContext,
      memIds: [memId],
    });

    const depositSlotPipeline = state.aggregateCalls.find(
      (call) =>
        call.collection === "dm_dm_tn_deposit" &&
        call.pipeline.some((stage) => stage.$group?.deposits),
    )?.pipeline;

    const groupStage = depositSlotPipeline?.find(
      (stage) => stage.$group?.deposits,
    );
    assert.deepEqual(groupStage?.$group.deposits, {
      $topN: {
        n: 21,
        sortBy: { bill_date: 1 },
        output: "$amt",
      },
    });
  });

  it("returns empty map without querying when memIds is empty", async () => {
    let queried = false;
    const getDb = () => {
      queried = true;
      return {
        collection() {
          throw new Error("should not query");
        },
      };
    };

    const repository = createRoyalty21TimesRepository(getDb);
    const metricsByMemId = await repository.fetchMemberMetrics({
      userContext,
      memIds: [],
    });

    assert.equal(queried, false);
    assert.equal(metricsByMemId.size, 0);
  });
});

/**
 * @param {{ groups?: { _id: { bucketIndex: number; round: number }; count: number }[] }} [options]
 */
function createDepositMatrixMockDb({ groups = [] } = {}) {
  const state = { aggregateCalls: [] };

  const memberCollection = {
    aggregate(pipeline) {
      state.aggregateCalls.push(pipeline);
      return {
        async toArray() {
          return groups;
        },
      };
    },
  };

  const getDb = () => ({
    collection(name) {
      if (name === "member") {
        return memberCollection;
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  });

  return { getDb, state };
}

describe("createRoyalty21TimesRepository — deposit matrix (single aggregation pipeline)", () => {
  it("returns a zero matrix with a single aggregate call when the pipeline finds no groups", async () => {
    const { getDb, state } = createDepositMatrixMockDb({ groups: [] });
    const repository = createRoyalty21TimesRepository(getDb);

    const matrix = await repository.findDepositMatrix({
      userContext,
      channelFilter: {
        channelType: "direct",
        regDateFrom: REG_FROM,
        regDateTo: REG_TO,
      },
    });

    assert.equal(state.aggregateCalls.length, 1);
    assert.equal(matrix.rounds, 21);
    assert.equal(matrix.counts.length, 9);
    assert.equal(matrix.counts[0].length, 21);
    assert.equal(
      matrix.counts.flat().every((n) => n === 0),
      true,
    );
    assert.equal(
      matrix.rowSums.every((n) => n === 0),
      true,
    );
  });

  it("reduces grouped (bucketIndex, round) rows into the counts/percents grid", async () => {
    const { getDb } = createDepositMatrixMockDb({
      groups: [
        { _id: { bucketIndex: 0, round: 0 }, count: 2 },
        { _id: { bucketIndex: 1, round: 1 }, count: 1 },
      ],
    });

    const repository = createRoyalty21TimesRepository(getDb);
    const matrix = await repository.findDepositMatrix({
      userContext,
      channelFilter: defaultChannelFilter,
    });

    assert.equal(matrix.counts[0][0], 2);
    assert.equal(matrix.counts[1][1], 1);
    assert.equal(matrix.counts[0][1], 0);
    assert.equal(matrix.rowSums[0], 2);
    assert.equal(matrix.percents[0][0], 100);
    assert.equal(matrix.percents[1][1], 100);
  });

  it("scopes the outer member $match by tenant + channel filter (unchanged from list/count)", async () => {
    const { getDb, state } = createDepositMatrixMockDb();
    const repository = createRoyalty21TimesRepository(getDb);

    await repository.findDepositMatrix({
      userContext,
      channelFilter: defaultChannelFilter,
    });

    const [pipeline] = state.aggregateCalls;
    assert.deepEqual(pipeline[0].$match, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
      referral: "Member",
      referral_uid: new ObjectId("507f1f77bcf86cd799439014"),
      ...regDateBounds,
    });
    assert.deepEqual(pipeline[1].$project, { _id: 1 });
  });

  it("scopes the $lookup sub-pipeline by ou_id/branch_id/status and sorts+limits to 21 by bill_date ASC", async () => {
    const { getDb, state } = createDepositMatrixMockDb();
    const repository = createRoyalty21TimesRepository(getDb);

    await repository.findDepositMatrix({
      userContext,
      channelFilter: defaultChannelFilter,
    });

    const [pipeline] = state.aggregateCalls;
    const lookupStage = pipeline.find((stage) => stage.$lookup);
    assert.equal(lookupStage.$lookup.from, "dm_dm_tn_deposit");
    // localField/foreignField (not let + $expr) so MongoDB's $lookup can use
    // an indexed join on mem_id instead of an unoptimizable $expr equality.
    assert.equal(lookupStage.$lookup.localField, "_id");
    assert.equal(lookupStage.$lookup.foreignField, "mem_id");

    const subMatch = lookupStage.$lookup.pipeline[0].$match;
    assert.deepEqual(subMatch.ou_id, new ObjectId(OU_ID));
    assert.deepEqual(subMatch.branch_id, new ObjectId(BRANCH_ID));
    assert.deepEqual(subMatch.status, { $in: DEPOSIT_SUCCESS_STATUS });

    assert.deepEqual(lookupStage.$lookup.pipeline[1].$sort, { bill_date: 1 });
    assert.equal(lookupStage.$lookup.pipeline[2].$limit, 21);

    const unwindStage = pipeline.find((stage) => stage.$unwind);
    assert.equal(unwindStage.$unwind.includeArrayIndex, "round");
  });

  it("builds $switch bucket cases from AMOUNT_BUCKETS (single source of truth)", async () => {
    const { getDb, state } = createDepositMatrixMockDb();
    const repository = createRoyalty21TimesRepository(getDb);

    await repository.findDepositMatrix({
      userContext,
      channelFilter: defaultChannelFilter,
    });

    const [pipeline] = state.aggregateCalls;
    const addFieldsStage = pipeline.find((stage) => stage.$addFields);
    const { branches, default: fallback } =
      addFieldsStage.$addFields.bucketIndex.$switch;

    assert.equal(branches.length, AMOUNT_BUCKETS.length);
    assert.equal(fallback, null);

    // First bucket (0-99): both a lower and upper bound.
    assert.deepEqual(branches[0].case, {
      $and: [{ $gte: ["$deposits.amt", 0] }, { $lte: ["$deposits.amt", 99] }],
    });
    assert.equal(branches[0].then, 0);

    // Top bucket (10000+): lower bound only, no upper bound.
    assert.deepEqual(branches[8].case, { $gte: ["$deposits.amt", 10_000] });
    assert.equal(branches[8].then, 8);

    const groupStage = pipeline.find((stage) => stage.$group);
    assert.deepEqual(groupStage.$group._id, {
      bucketIndex: "$bucketIndex",
      round: "$round",
    });
  });
});
