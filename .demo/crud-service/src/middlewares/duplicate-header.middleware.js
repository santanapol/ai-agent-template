"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

const CRITICAL_HEADERS = new Set([
  "x-gateway-secret",
  "x-request-id",
  "x-user-id",
  "x-user-ou",
  "x-user-branch",
  "content-type",
  "origin",
  "if-match",
]);

function countHeaderOccurrences(rawHeaders) {
  const countMap = new Map();

  for (let index = 0; index < rawHeaders.length; index += 2) {
    const key = String(rawHeaders[index] || "").toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  return countMap;
}

function duplicateHeaderGuard(req, _res, next) {
  const counts = countHeaderOccurrences(req.rawHeaders || []);

  for (const headerName of CRITICAL_HEADERS) {
    if ((counts.get(headerName) || 0) > 1) {
      if (headerName === "x-gateway-secret") {
        return next(
          new HttpError(
            401,
            CODES.GATEWAY_SECRET_REJECTED,
            "Authentication failed",
          ),
        );
      }

      return next(
        new HttpError(
          400,
          CODES.INVALID_HEADER,
          `Invalid header: ${headerName}`,
        ),
      );
    }
  }

  return next();
}

module.exports = duplicateHeaderGuard;
