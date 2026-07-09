import { mapInviteLinkDoc } from "./invite-links.repository.js";

/**
 * @param {ReturnType<import('./invite-links.repository.js').createInviteLinksRepository>} repository
 */
export function createInviteLinksService(repository) {
  return {
    /**
     * @param {{ ouId: string; branchId: string }} userContext
     * @param {{ q?: string; limit?: number }} [query]
     */
    async listInviteLinks(userContext, query = {}) {
      const { docs } = await repository.findByTenant({
        ouId: userContext.ouId,
        branchId: userContext.branchId,
        q: query.q,
        limit: query.limit,
      });

      return docs.map(mapInviteLinkDoc);
    },
  };
}
