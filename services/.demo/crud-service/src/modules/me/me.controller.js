"use strict";

const HttpError = require("../../utils/http-error");
const CODES = require("../../utils/error-codes");
const { successEnvelope } = require("../../utils/envelope");
const { readErrorCode } = require("../../utils/error-code");
const { buildMeFromTrustedHeaders } = require("./me.service");

function getMe(req, res, next) {
  try {
    const data = buildMeFromTrustedHeaders(req.headers);
    return res.status(200).json(successEnvelope(data));
  } catch (err) {
    const code = readErrorCode(err);
    if (code === "MISSING_GATEWAY_USER_CONTEXT") {
      return next(
        new HttpError(
          403,
          CODES.MISSING_GATEWAY_USER_CONTEXT,
          "Required user context is missing",
        ),
      );
    }
    if (code === "INVALID_USER_CONTEXT") {
      return next(
        new HttpError(
          403,
          CODES.INVALID_USER_CONTEXT,
          "User or tenant context is invalid",
        ),
      );
    }
    return next(err);
  }
}

module.exports = {
  getMe,
};
