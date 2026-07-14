import { mapReferringMemberDoc } from "./referring-members.repository.js";

/**
 * @param {ReturnType<import('./referring-members.repository.js').createReferringMembersRepository>} repository
 */
export function createReferringMembersService(repository) {
  return {
    /**
     * @param {{ ouId: string; branchId: string }} userContext
     * @param {{ username: string }} query
     */
    async listReferringMembers(userContext, query) {
      const { doc } = await repository.findReferrerByExactUsername({
        ouId: userContext.ouId,
        branchId: userContext.branchId,
        username: query.username,
      });

      return doc ? [mapReferringMemberDoc(doc)] : [];
    },
  };
}
