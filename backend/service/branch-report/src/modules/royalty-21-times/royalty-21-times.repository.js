import { ObjectId } from "mongodb";

import {
  DEPOSIT_SUCCESS_STATUS,
  WITHDRAW_SUCCESS_STATUS,
} from "../../lib/constants.js";
import { buildMemberReportFilter } from "../../lib/channel-filter.js";
import {
  createMetricsMap,
  DEPOSIT_COLLECTION,
  finalizeMemberMetrics,
  padDepositsTo21,
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

      const [billinRows, withdrawRows, depositRows] = await Promise.all([
        aggregateBillin(getDb, { ouId, branchId, memIds }),
        aggregateWithdraw(getDb, { ouId, branchId, memIds }),
        aggregateDepositSlots(getDb, { ouId, branchId, memIds }),
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

      for (const metrics of metricsByMemId.values()) {
        finalizeMemberMetrics(metrics);
      }

      return metricsByMemId;
    },
  };
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
