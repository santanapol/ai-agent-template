"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

function enforceAccept(req, _res, next) {
  const accept = req.headers.accept;
  if (typeof accept !== "string" || !accept.trim()) {
    return next();
  }

  const normalized = accept.toLowerCase();
  if (normalized.includes("application/json") || normalized.includes("*/*")) {
    return next();
  }

  return next(
    new HttpError(400, CODES.INVALID_HEADER, "Invalid header: accept"),
  );
}

module.exports = enforceAccept;
