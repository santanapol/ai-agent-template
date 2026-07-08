import { mapInviteLinkDoc } from "./invite-links.repository.js";

/**
 * @param {ReturnType<import('./invite-links.repository.js').createInviteLinksRepository>} repository
 */
export function createInviteLinksService(repository) {
  return {
    /**
     * @param {{ ouId: string; branchId: string }} userContext
     */
    async listInviteLinks(userContext) {
      const { docs } = await repository.findByTenant({
        ouId: userContext.ouId,
        branchId: userContext.branchId,
      });

      return docs.map(mapInviteLinkDoc);
    },
  };
}
