import CODES from "./error-codes.js";
import { HttpError } from "./http-error.js";
import { errorEnvelope } from "./envelope.js";

const MONGO_DUPLICATE_KEY_ERROR = 11000;

export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId || request.id;

    if (error.validation) {
      return reply.status(400).send(
        errorEnvelope({
          code: CODES.INVALID_PARAM,
          message: "Request validation failed",
          requestId,
        }),
      );
    }

    if (error instanceof HttpError) {
      return reply.status(error.status).send(
        errorEnvelope({
          code: error.code,
          message: error.message,
          data: error.data,
          requestId,
        }),
      );
    }

    if (
      error.name === "MongoServerError" &&
      error.code === MONGO_DUPLICATE_KEY_ERROR
    ) {
      return reply.status(409).send(
        errorEnvelope({
          code: CODES.DUPLICATE,
          message: "A resource with this identifier already exists",
          requestId,
        }),
      );
    }

    request.log.error({ err: error, requestId }, "Unhandled request error");

    return reply.status(500).send(
      errorEnvelope({
        code: CODES.INTERNAL_ERROR,
        message: "An internal error occurred",
        requestId,
      }),
    );
  });
}
