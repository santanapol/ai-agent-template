import { sendError, sendSuccess } from '../../lib/response.js';

/**
 * @param {ReturnType<import('./invite-links.service.js').createInviteLinksService>} service
 */
export function createInviteLinksController(service) {
  return {
    async list(request, reply) {
      try {
        const data = await service.listInviteLinks(request.userContext);
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
