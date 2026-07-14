import { createParamError } from "../../lib/param-error.js";
import { createEmptyMemberMetrics } from "../../lib/member-metrics.js";
import { normalizePagination } from "../../lib/pagination.js";
import { formatRegisterDate } from "../../lib/format-register.js";

/**
 * @param {ReturnType<import('./royalty-21-times.repository.js').createRoyalty21TimesRepository>} repository
 * @param {ReturnType<import('../invite-links/invite-links.repository.js').createInviteLinksRepository>} inviteLinksRepository
 * @param {ReturnType<import('../referring-members/referring-members.repository.js').createReferringMembersRepository>} referringMembersRepository
 */
export function createRoyalty21TimesService(
  repository,
  inviteLinksRepository,
  referringMembersRepository,
) {
  /**
   * Shared channel / referral / invite validation for list + deposit matrix.
   * @param {{
   *   userContext: { ouId: string; branchId: string };
   *   query: {
   *     channelType: string;
   *     inviteLinkId?: string;
   *     referralUid?: string;
   *     referralUsername?: string;
   *     regDateFrom: string;
   *     regDateTo: string;
   *   };
   * }} input
   */
  async function resolveChannelFilter(input) {
    const { userContext, query } = input;

    let referralUid = query.referralUid;
    if (query.channelType === "member_referral") {
      const referralUsername = query.referralUsername?.trim();
      if (referralUsername) {
        const { doc } =
          await referringMembersRepository.findReferrerByExactUsername({
            ouId: userContext.ouId,
            branchId: userContext.branchId,
            username: referralUsername,
          });
        if (!doc) {
          throw createParamError(
            400,
            "INVALID_PARAM",
            "Referring member not found",
          );
        }
        referralUid = doc._id.toString();
      } else if (referralUid) {
        const exists =
          await referringMembersRepository.existsAsReferrerForTenant({
            ouId: userContext.ouId,
            branchId: userContext.branchId,
            referralUid,
          });
        if (!exists) {
          throw createParamError(400, "INVALID_PARAM", "Invalid referralUid");
        }
      } else {
        throw createParamError(
          400,
          "INVALID_PARAM",
          "referralUsername is required for member_referral",
        );
      }
    }

    if (query.channelType === "affiliate_link" && query.inviteLinkId) {
      const exists = await inviteLinksRepository.existsForTenant({
        ouId: userContext.ouId,
        branchId: userContext.branchId,
        inviteLinkId: query.inviteLinkId,
      });
      if (!exists) {
        throw createParamError(400, "INVALID_PARAM", "Invalid inviteLinkId");
      }
    }

    return {
      channelType: query.channelType,
      inviteLinkId: query.inviteLinkId,
      referralUid,
      regDateFrom: query.regDateFrom,
      regDateTo: query.regDateTo,
    };
  }

  return {
    /**
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   query: {
     *     channelType: string;
     *     inviteLinkId?: string;
     *     referralUid?: string;
     *     referralUsername?: string;
     *     regDateFrom: string;
     *     regDateTo: string;
     *     page?: number;
     *     pageSize?: number;
     *   };
     * }} input
     */
    async getReport(input) {
      const { userContext, query } = input;
      const { page, pageSize } = normalizePagination({
        page: query.page,
        pageSize: query.pageSize,
      });

      const channelFilter = await resolveChannelFilter({ userContext, query });

      const [{ members }, { total }] = await Promise.all([
        repository.findMembersPage({
          userContext,
          channelFilter,
          page,
          pageSize,
        }),
        repository.countMembers({
          userContext,
          channelFilter,
        }),
      ]);

      const memIds = members.map((member) => member._id);
      const metricsByMemId = await repository.fetchMemberMetrics({
        userContext,
        memIds,
      });

      const data = members.map((member) => {
        const metrics =
          metricsByMemId.get(member._id.toString()) ??
          createEmptyMemberMetrics();

        return {
          username: member.username,
          register: formatRegisterDate(member.reg_date),
          billin: metrics.billin,
          withdraw: metrics.withdraw,
          promotion: metrics.promotion,
          revenue: metrics.revenue,
          deposits: metrics.deposits,
        };
      });

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
        },
      };
    },

    /**
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   query: {
     *     channelType: string;
     *     inviteLinkId?: string;
     *     referralUid?: string;
     *     referralUsername?: string;
     *     regDateFrom: string;
     *     regDateTo: string;
     *   };
     * }} input
     */
    async getDepositMatrix(input) {
      const { userContext, query } = input;
      const channelFilter = await resolveChannelFilter({ userContext, query });
      return repository.findDepositMatrix({
        userContext,
        channelFilter,
      });
    },
  };
}
