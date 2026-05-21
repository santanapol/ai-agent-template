"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

function readHeader(req, name) {
  const value = req.headers[name];
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function requiredUserContext(req, _res, next) {
  const userId = readHeader(req, "x-user-id");
  const userOu = readHeader(req, "x-user-ou");
  const userBranch = readHeader(req, "x-user-branch");

  if (!userId || !userOu || !userBranch) {
    return next(
      new HttpError(
        403,
        CODES.MISSING_GATEWAY_USER_CONTEXT,
        "Missing required user context headers",
      ),
    );
  }

  req.userContext = {
    userId,
    ouId: userOu,
    branchId: userBranch,
  };

  return next();
}

module.exports = requiredUserContext;
