import { ObjectId } from "mongodb";

import {
  DEPOSIT_SUCCESS_STATUS,
  PROMOTION_MODULES,
  PROMOTION_SUCCESS_STATUS,
  WITHDRAW_SUCCESS_STATUS,
} from "../../lib/constants.js";
import { buildMemberReportFilter } from "../../lib/channel-filter.js";
import {
  AMOUNT_BUCKETS,
  computePercentMatrix,
  createEmptyCountGrid,
  DEPOSIT_MATRIX_ROUNDS,
} from "../../lib/deposit-matrix.js";
import {
  createMetricsMap,
  DEPOSIT_COLLECTION,
  finalizeMemberMetrics,
  padDepositsTo21,
  PROMOTION_COLLECTION,
  WITHDRAW_COLLECTION,
} from "../../lib/member-metrics.js";
import { paginationSkip } from "../../lib/pagination.js";

export const MEMBER_COLLECTION = "member";

/**
 * @param {() => import('mongodb').Db} getDb
 */
export function createRoyalty21TimesRepository(getDb) {
  /**
   * @param {{
   *   userContext: { ouId: string; branchId: string };
   *   channelFilter: {
   *     channelType: string;
   *     inviteLinkId?: string;
   *     regDateFrom: string;
   *     regDateTo: string;
   *   };
   * }} input
   */
  function memberReportFilter(input) {
    const { userContext, channelFilter } = input;
    return buildMemberReportFilter({
      ouId: userContext.ouId,
      branchId: userContext.branchId,
      ...channelFilter,
    });
  }

  return {
    /**
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   channelFilter: {
     *     channelType: string;
     *     inviteLinkId?: string;
     *     regDateFrom: string;
     *     regDateTo: string;
     *   };
     *   page: number;
     *   pageSize: number;
     * }} input
     */
    async findMembersPage(input) {
      const filter = memberReportFilter(input);

      const skip = paginationSkip(input.page, input.pageSize);

      const members = await getDb()
        .collection(MEMBER_COLLECTION)
        .find(filter)
        .sort({ username: 1 })
        .skip(skip)
        .limit(input.pageSize)
        .project({ _id: 1, username: 1, reg_date: 1 })
        .toArray();

      return { filter, members };
    },

    /**
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   channelFilter: {
     *     channelType: string;
     *     inviteLinkId?: string;
     *     regDateFrom: string;
     *     regDateTo: string;
     *   };
     * }} input
     */
    async countMembers(input) {
      const filter = memberReportFilter(input);

      const total = await getDb()
        .collection(MEMBER_COLLECTION)
        .countDocuments(filter);

      return { filter, total };
    },

    /**
     * Amount-bucket × deposit-round matrix for all members matching the filter
     * (not paginated). Computed with a single aggregation pipeline scoped by
     * the member filter — no per-member `_id` fetch, no batching, no cap on
     * cohort size. Uses raw deposit slots — never pads before bucketing.
     *
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   channelFilter: {
     *     channelType: string;
     *     inviteLinkId?: string;
     *     referralUid?: string;
     *     regDateFrom: string;
     *     regDateTo: string;
     *   };
     * }} input
     */
    async findDepositMatrix(input) {
      const filter = memberReportFilter(input);
      const ouId = new ObjectId(input.userContext.ouId);
      const branchId = new ObjectId(input.userContext.branchId);

      const pipeline = buildDepositMatrixPipeline({ filter, ouId, branchId });
      const groups = await getDb()
        .collection(MEMBER_COLLECTION)
        .aggregate(pipeline)
        .toArray();

      const counts = createEmptyCountGrid();
      for (const group of groups) {
        counts[group._id.bucketIndex][group._id.round] = group.count;
      }

      const { rowSums, percents, percentRowSums } =
        computePercentMatrix(counts);

      return {
        buckets: AMOUNT_BUCKETS,
        rounds: DEPOSIT_MATRIX_ROUNDS,
        counts,
        rowSums,
        percents,
        percentRowSums,
      };
    },

    /**
     * Bulk lifetime metrics for a page of members (no per-member DB loops).
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   memIds: import('mongodb').ObjectId[];
     * }} input
     * @returns {Promise<Map<string, {
     *   billin: number;
     *   withdraw: number;
     *   promotion: number;
     *   revenue: number;
     *   deposits: number[];
     * }>>}
     */
    async fetchMemberMetrics(input) {
      const { userContext, memIds } = input;

      if (memIds.length === 0) {
        return new Map();
      }

      const ouId = new ObjectId(userContext.ouId);
      const branchId = new ObjectId(userContext.branchId);
      const metricsByMemId = createMetricsMap(memIds);

      const [billinRows, withdrawRows, depositRows, promotionRows] =
        await Promise.all([
          aggregateBillin(getDb, { ouId, branchId, memIds }),
          aggregateWithdraw(getDb, { ouId, branchId, memIds }),
          aggregateDepositSlots(getDb, { ouId, branchId, memIds }),
          aggregatePromotion(getDb, { ouId, branchId, memIds }),
        ]);

      for (const row of billinRows) {
        const metrics = metricsByMemId.get(row._id.toString());
        if (metrics) {
          metrics.billin = row.billin;
        }
      }

      for (const row of withdrawRows) {
        const metrics = metricsByMemId.get(row._id.toString());
        if (metrics) {
          metrics.withdraw = row.withdraw;
        }
      }

      for (const row of depositRows) {
        const metrics = metricsByMemId.get(row._id.toString());
        if (metrics) {
          metrics.deposits = padDepositsTo21(row.deposits);
        }
      }

      for (const row of promotionRows) {
        const metrics = metricsByMemId.get(row._id.toString());
        if (metrics) {
          metrics.promotion = row.promotion;
        }
      }

      for (const metrics of metricsByMemId.values()) {
        finalizeMemberMetrics(metrics);
      }

      return metricsByMemId;
    },
  };
}

/**
 * Builds a `$switch` expression bucketing `amtField` exactly like
 * `amountBucketIndex` (`../../lib/deposit-matrix.js`) — generated from
 * `AMOUNT_BUCKETS` at pipeline-construction time so the two can never drift
 * apart. The top bucket has no upper bound (only `$gte`), matching
 * `AMOUNT_BUCKETS`'s `max: Number.POSITIVE_INFINITY` for `10000+`.
 *
 * @param {string} amtField
 */
function buildBucketSwitch(amtField) {
  const branches = AMOUNT_BUCKETS.map((bucket, index) => {
    const conditions = [{ $gte: [amtField, bucket.min] }];
    if (Number.isFinite(bucket.max)) {
      conditions.push({ $lte: [amtField, bucket.max] });
    }

    return {
      case: conditions.length === 1 ? conditions[0] : { $and: conditions },
      then: index,
    };
  });

  return { $switch: { branches, default: null } };
}

/**
 * Single aggregation pipeline computing the amount-bucket × deposit-round
 * matrix for every member matching `filter`, scoped to `ouId`/`branchId`.
 * Starts on the member collection, `$lookup`s each member's top-21 deposits
 * (by `bill_date` ascending, same semantics as `aggregateDepositSlots`'s
 * `$topN`), and groups into `(bucketIndex, round)` counts server-side —
 * no per-member `_id` fetch into Node, no batching, no cap on cohort size.
 *
 * @param {{
 *   filter: import('mongodb').Filter<import('mongodb').Document>;
 *   ouId: import('mongodb').ObjectId;
 *   branchId: import('mongodb').ObjectId;
 * }} params
 */
function buildDepositMatrixPipeline({ filter, ouId, branchId }) {
  return [
    { $match: filter },
    { $project: { _id: 1 } },
    {
      // localField/foreignField (not let + $expr) so MongoDB's $lookup
      // indexed-join optimization reliably applies to the mem_id
      // correlation; ou_id/branch_id/status stay as plain match conditions
      // in the sub-pipeline (defense-in-depth tenant scoping).
      $lookup: {
        from: DEPOSIT_COLLECTION,
        localField: "_id",
        foreignField: "mem_id",
        pipeline: [
          {
            $match: {
              ou_id: ouId,
              branch_id: branchId,
              status: { $in: DEPOSIT_SUCCESS_STATUS },
            },
          },
          { $sort: { bill_date: 1 } },
          { $limit: DEPOSIT_MATRIX_ROUNDS },
          { $project: { _id: 0, amt: 1 } },
        ],
        as: "deposits",
      },
    },
    { $unwind: { path: "$deposits", includeArrayIndex: "round" } },
    { $addFields: { bucketIndex: buildBucketSwitch("$deposits.amt") } },
    { $match: { bucketIndex: { $ne: null } } },
    {
      $group: {
        _id: { bucketIndex: "$bucketIndex", round: "$round" },
        count: { $sum: 1 },
      },
    },
  ];
}

/**
 * @param {() => import('mongodb').Db} getDb
 * @param {{
 *   ouId: import('mongodb').ObjectId;
 *   branchId: import('mongodb').ObjectId;
 *   memIds: import('mongodb').ObjectId[];
 * }} scope
 */
async function aggregateBillin(getDb, scope) {
  return getDb()
    .collection(DEPOSIT_COLLECTION)
    .aggregate([
      {
        $match: {
          ou_id: scope.ouId,
          branch_id: scope.branchId,
          mem_id: { $in: scope.memIds },
          status: { $in: DEPOSIT_SUCCESS_STATUS },
        },
      },
      {
        $group: {
          _id: "$mem_id",
          billin: { $sum: "$amt" },
        },
      },
    ])
    .toArray();
}

/**
 * @param {() => import('mongodb').Db} getDb
 * @param {{
 *   ouId: import('mongodb').ObjectId;
 *   branchId: import('mongodb').ObjectId;
 *   memIds: import('mongodb').ObjectId[];
 * }} scope
 */
async function aggregateWithdraw(getDb, scope) {
  return getDb()
    .collection(WITHDRAW_COLLECTION)
    .aggregate([
      {
        $match: {
          ou_id: scope.ouId,
          branch_id: scope.branchId,
          uid: { $in: scope.memIds },
          wd_status: WITHDRAW_SUCCESS_STATUS,
        },
      },
      {
        $group: {
          _id: "$uid",
          withdraw: { $sum: "$amt" },
        },
      },
    ])
    .toArray();
}

/**
 * @param {() => import('mongodb').Db} getDb
 * @param {{
 *   ouId: import('mongodb').ObjectId;
 *   branchId: import('mongodb').ObjectId;
 *   memIds: import('mongodb').ObjectId[];
 * }} scope
 */
async function aggregateDepositSlots(getDb, scope) {
  return getDb()
    .collection(DEPOSIT_COLLECTION)
    .aggregate([
      {
        $match: {
          ou_id: scope.ouId,
          branch_id: scope.branchId,
          mem_id: { $in: scope.memIds },
          status: { $in: DEPOSIT_SUCCESS_STATUS },
        },
      },
      {
        $group: {
          _id: "$mem_id",
          deposits: {
            $topN: {
              n: 21,
              sortBy: { bill_date: 1 },
              output: "$amt",
            },
          },
        },
      },
    ])
    .toArray();
}

/**
 * Promotion = round(sum(bonus_amt) - sum(accrued_expense)).
 * Lifetime for Royalty 21 — no `recv_date` filter (UTC field used by monthly reports).
 * @param {() => import('mongodb').Db} getDb
 * @param {{
 *   ouId: import('mongodb').ObjectId;
 *   branchId: import('mongodb').ObjectId;
 *   memIds: import('mongodb').ObjectId[];
 * }} scope
 */
async function aggregatePromotion(getDb, scope) {
  return getDb()
    .collection(PROMOTION_COLLECTION)
    .aggregate([
      {
        $match: {
          ou_id: scope.ouId,
          branch_id: scope.branchId,
          uid: { $in: scope.memIds },
          status: PROMOTION_SUCCESS_STATUS,
          module: { $in: PROMOTION_MODULES },
        },
      },
      {
        $group: {
          _id: "$uid",
          pro_amt: { $sum: "$bonus_amt" },
          pro_accrued: { $sum: "$accrued_expense" },
        },
      },
      {
        $project: {
          promotion: {
            $round: [{ $subtract: ["$pro_amt", "$pro_accrued"] }, 0],
          },
        },
      },
    ])
    .toArray();
}
