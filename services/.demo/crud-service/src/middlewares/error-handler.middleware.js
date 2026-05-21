"use strict";

const logger = require("../config/logger");
const { errorEnvelope } = require("../utils/envelope");
const CODES = require("../utils/error-codes");
const HttpError = require("../utils/http-error");

/** MongoDB server error code: Document failed validation */
const MONGO_DOCUMENT_VALIDATION_ERROR = 121;
/** MongoDB duplicate key on unique index */
const MONGO_DUPLICATE_KEY_ERROR = 11000;

function errorHandler(err, req, res, _next) {
  res.setHeader("x-request-id", req.id || "");

  if (err instanceof HttpError) {
    return res.status(err.status).json(
      errorEnvelope({
        code: err.code,
        message: err.message,
        data: err.data || null,
        requestId: req.id,
      }),
    );
  }

  /** body-parser / express.json — invalid JSON (strict JSON only; no comments or trailing commas) */
  if (err.type === "entity.parse.failed") {
    logger.warn(
      { requestId: req.id, errorMessage: err.message },
      "Invalid JSON request body",
    );
    return res.status(400).json(
      errorEnvelope({
        code: CODES.INVALID_JSON_BODY,
        message: "Request body is not valid JSON",
        data: null,
        requestId: req.id,
      }),
    );
  }

  if (err.name === "MongoServerError" && err.code === 18) {
    logger.error(
      {
        requestId: req.id,
        errorName: err.name,
        errorMessage: err.message,
        mongoCode: err.code,
      },
      "MongoDB authentication failed",
    );
    return res.status(500).json(
      errorEnvelope({
        code: CODES.DATASTORE_CREDENTIAL_REJECTED,
        message: "Data store credentials rejected or misconfigured",
        data: null,
        requestId: req.id,
      }),
    );
  }

  if (
    err.name === "MongoServerError" &&
    err.code === MONGO_DOCUMENT_VALIDATION_ERROR
  ) {
    logger.warn(
      {
        requestId: req.id,
        errorName: err.name,
        errorMessage: err.message,
        mongoCode: err.code,
      },
      "MongoDB document validation failed",
    );
    return res.status(400).json(
      errorEnvelope({
        code: CODES.INVALID_PARAM,
        message: err.message || "Document validation failed",
        data: null,
        requestId: req.id,
      }),
    );
  }

  if (
    err.name === "MongoServerError" &&
    err.code === MONGO_DUPLICATE_KEY_ERROR
  ) {
    logger.warn(
      {
        requestId: req.id,
        keyPattern: err.keyPattern,
        keyValue: err.keyValue,
      },
      "MongoDB duplicate key (unique index)",
    );
    return res.status(409).json(
      errorEnvelope({
        code: CODES.DUPLICATE,
        message: "A resource with this identifier already exists",
        data: null,
        requestId: req.id,
      }),
    );
  }

  logger.error(
    {
      requestId: req.id,
      errorName: err.name,
      errorMessage: err.message,
      mongoCode: typeof err.code === "number" ? err.code : undefined,
      stack: err.stack,
    },
    "Unhandled request error",
  );

  if (res.headersSent) {
    return;
  }

  return res.status(500).json(
    errorEnvelope({
      code: CODES.INTERNAL_ERROR,
      message: "An internal error occurred",
      data: null,
      requestId: req.id,
    }),
  );
}

module.exports = errorHandler;
