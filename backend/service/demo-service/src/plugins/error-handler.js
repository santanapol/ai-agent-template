import fp from "fastify-plugin";
import CODES from "../lib/error-codes.js";
import { HttpError } from "../lib/http-error.js";
import { errorEnvelope } from "../lib/envelope.js";
import { formatValidationErrors } from "../lib/validation-error.js";

const MONGO_DOCUMENT_VALIDATION_ERROR = 121;
const MONGO_DUPLICATE_KEY_ERROR = 11000;

export default fp(async function customErrorHandler(fastify) {
  fastify.setErrorHandler(function (error, request, reply) {
    reply.header("x-request-id", request.id || "");

    if (error.validation) {
      request.log.warn(
        { requestId: request.id, validationDetails: error.validation },
        "Validation failed",
      );
      return reply.status(400).send(
        errorEnvelope({
          code: CODES.INVALID_PARAM,
          message: "Request validation failed",
          data: formatValidationErrors("request", error.validation),
          requestId: request.id,
        }),
      );
    }

    if (error instanceof HttpError) {
      return reply.status(error.status).send(
        errorEnvelope({
          code: error.code,
          message: error.message,
          data: error.data || null,
          requestId: request.id,
        }),
      );
    }

    if (error.name === "MongoServerError" && error.code === 18) {
      request.log.error(
        {
          requestId: request.id,
          errorName: error.name,
          errorMessage: error.message,
          mongoCode: error.code,
        },
        "MongoDB authentication failed",
      );
      return reply.status(500).send(
        errorEnvelope({
          code: CODES.DATASTORE_CREDENTIAL_REJECTED,
          message: "Data store credentials rejected or misconfigured",
          requestId: request.id,
        }),
      );
    }

    if (
      error.name === "MongoServerError" &&
      error.code === MONGO_DOCUMENT_VALIDATION_ERROR
    ) {
      request.log.warn(
        {
          requestId: request.id,
          errorName: error.name,
          errorMessage: error.message,
          mongoCode: error.code,
        },
        "MongoDB document validation failed",
      );
      return reply.status(400).send(
        errorEnvelope({
          code: CODES.INVALID_PARAM,
          message: error.message || "Document validation failed",
          requestId: request.id,
        }),
      );
    }

    if (
      error.name === "MongoServerError" &&
      error.code === MONGO_DUPLICATE_KEY_ERROR
    ) {
      request.log.warn(
        {
          requestId: request.id,
          keyPattern: error.keyPattern,
          keyValue: error.keyValue,
        },
        "MongoDB duplicate key (unique index)",
      );
      return reply.status(409).send(
        errorEnvelope({
          code: CODES.DUPLICATE,
          message: "A resource with this identifier already exists",
          requestId: request.id,
        }),
      );
    }

    // Body parsing errors in Fastify
    if (
      error.statusCode === 400 &&
      error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE"
    ) {
      return reply.status(415).send(
        errorEnvelope({
          code: CODES.UNSUPPORTED_MEDIA_TYPE,
          message: error.message,
          requestId: request.id,
        }),
      );
    }
    if (
      error.statusCode === 400 &&
      error.code === "FST_ERR_CTP_BODY_TOO_LARGE"
    ) {
      return reply.status(413).send(
        errorEnvelope({
          code: CODES.INVALID_JSON_BODY,
          message: error.message,
          requestId: request.id,
        }),
      );
    }
    if (
      error.statusCode === 400 &&
      (error.code === "FST_ERR_CTP_EMPTY_JSON_BODY" ||
        error.message.includes("Unexpected token"))
    ) {
      return reply.status(400).send(
        errorEnvelope({
          code: CODES.INVALID_JSON_BODY,
          message: "Request body is not valid JSON",
          requestId: request.id,
        }),
      );
    }

    request.log.error(
      {
        requestId: request.id,
        errorName: error.name,
        errorMessage: error.message,
        mongoCode: typeof error.code === "number" ? error.code : undefined,
        stack: error.stack,
      },
      "Unhandled request error",
    );

    return reply.status(500).send(
      errorEnvelope({
        code: CODES.INTERNAL_ERROR,
        message: "An internal error occurred",
        requestId: request.id,
      }),
    );
  });
});
