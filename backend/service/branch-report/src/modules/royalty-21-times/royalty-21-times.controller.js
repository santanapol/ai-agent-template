import { sendSuccess } from "../../lib/response.js";

/**
 * @param {ReturnType<import('./royalty-21-times.service.js').createRoyalty21TimesService>} service
 */
export function createRoyalty21TimesController(service) {
  return {
    async list(request, reply) {
      const result = await service.getReport({
        userContext: request.userContext,
        query: request.query,
      });

      return sendSuccess(reply, {
        data: result.data,
        pagination: result.pagination,
        requestId: request.requestId,
      });
    },

    async depositMatrix(request, reply) {
      const data = await service.getDepositMatrix({
        userContext: request.userContext,
        query: request.query,
      });

      return sendSuccess(reply, {
        data,
        requestId: request.requestId,
      });
    },
  };
}
