import { createParamError } from "../../lib/param-error.js";
import { createEmptyMemberMetrics } from "../../lib/member-metrics.js";
import { normalizePagination } from "../../lib/pagination.js";
import { formatRegisterDate } from "../../lib/format-register.js";

/**
 * @param {ReturnType<import('./royalty-21-times.repository.js').createRoyalty21TimesRepository>} repository
 * @param {ReturnType<import('../invite-links/invite-links.repository.js').createInviteLinksRepository>} inviteLinksRepository
 */
export function createRoyalty21TimesService(repository, inviteLinksRepository) {
  return {
    /**
     * @param {{
     *   userContext: { ouId: string; branchId: string };
     *   query: {
     *     channelType: string;
     *     inviteLinkId?: string;
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

      const channelFilter = {
        channelType: query.channelType,
        inviteLinkId: query.inviteLinkId,
        regDateFrom: query.regDateFrom,
        regDateTo: query.regDateTo,
      };

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
  };
}
