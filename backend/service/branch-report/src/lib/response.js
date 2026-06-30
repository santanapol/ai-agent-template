/**
 * @param {import('fastify').FastifyReply} reply
 * @param {{
 *   statusCode?: number;
 *   code?: string;
 *   message?: string | null;
 *   data?: unknown;
 *   pagination?: { page: number; pageSize: number; total: number };
 *   requestId: string;
 * }} options
 */
export function sendSuccess(reply, options) {
  const {
    statusCode = 200,
    code = 'SUCCESS',
    message = null,
    data,
    pagination,
    requestId,
  } = options;

  const body = {
    success: true,
    code,
    message,
    data,
    requestId,
  };

  if (pagination !== undefined) {
    body.pagination = pagination;
  }

  return reply.status(statusCode).send(body);
}

/**
 * @param {import('fastify').FastifyReply} reply
 * @param {{
 *   statusCode: number;
 *   code: string;
 *   message: string;
 *   requestId: string;
 * }} options
 */
export function sendError(reply, options) {
  const { statusCode, code, message, requestId } = options;

  return reply.status(statusCode).send({
    success: false,
    code,
    message,
    data: null,
    requestId,
  });
}
