import { randomUUID } from "node:crypto";

import { buildErrorReply, INTERNAL_ERROR_MESSAGE } from "./response.js";

export function registerGlobalErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.headers["x-request-id"] ?? randomUUID();

    if (error.validation) {
      return reply.status(400).send(
        buildErrorReply({
          code: "INVALID_PARAM",
          message: "Request validation failed",
          requestId,
        }),
      );
    }

    request.log.error({ err: error, requestId }, "Unhandled request error");

    return reply.status(500).send(
      buildErrorReply({
        code: "INTERNAL_ERROR",
        message: INTERNAL_ERROR_MESSAGE,
        requestId,
      }),
    );
  });
}
