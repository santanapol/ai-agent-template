import { sendError } from "./response.js";

/**
 * @param {import('fastify').FastifyInstance} app
 */
export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId ?? "unknown";

    if (error.validation) {
      return sendError(reply, {
        statusCode: 400,
        code: "INVALID_PARAM",
        message: error.message,
        requestId,
      });
    }

    if (error.statusCode && error.code) {
      return sendError(reply, {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message ?? "Request failed",
        requestId,
      });
    }

    request.log.error({ err: error, requestId }, "Unhandled error");

    return sendError(reply, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
      requestId,
    });
  });
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
export function registerNotFoundHandler(app) {
  app.setNotFoundHandler((request, reply) => {
    return sendError(reply, {
      statusCode: 404,
      code: "NO_MATCHING_API_PATH",
      message: "No matching resource for this path",
      requestId: request.requestId ?? "unknown",
    });
  });
}
