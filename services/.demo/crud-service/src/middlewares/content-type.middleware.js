"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

function enforceContentType(req, _res, next) {
  if (!METHODS_WITH_BODY.has(req.method)) {
    return next();
  }

  const contentType = req.headers["content-type"];
  if (typeof contentType !== "string" || !contentType.trim()) {
    return next(
      new HttpError(
        400,
        CODES.MISSING_CONTENT_TYPE,
        "Request body present but Content-Type header missing",
      ),
    );
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    return next(
      new HttpError(
        415,
        CODES.UNSUPPORTED_MEDIA_TYPE,
        "Request Content-Type is not supported",
      ),
    );
  }

  return next();
}

module.exports = enforceContentType;
