import { sendError, sendSuccess } from "../../lib/response.js";

/**
 * @param {ReturnType<import('./referring-members.service.js').createReferringMembersService>} service
 */
export function createReferringMembersController(service) {
  return {
    async list(request, reply) {
      try {
        const data = await service.listReferringMembers(
          request.userContext,
          request.query ?? {},
        );
        return sendSuccess(reply, {
          data,
          requestId: request.requestId,
        });
      } catch (error) {
        if (error.statusCode && error.code) {
          return sendError(reply, {
            statusCode: error.statusCode,
            code: error.code,
            message: error.message,
            requestId: request.requestId,
          });
        }
        throw error;
      }
    },
  };
}
