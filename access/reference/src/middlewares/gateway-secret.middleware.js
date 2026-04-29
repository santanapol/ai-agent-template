"use strict";

const nodeCrypto = require("node:crypto");
const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

const AUTH_FAILURE_MESSAGE = "Authentication failed";

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return nodeCrypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createGatewaySecretMiddleware(sharedSecret) {
  return (req, _res, next) => {
    const incoming = req.headers["x-gateway-secret"];

    if (typeof incoming !== "string" || !incoming.trim()) {
      return next(
        new HttpError(401, CODES.GATEWAY_SECRET_REJECTED, AUTH_FAILURE_MESSAGE),
      );
    }

    if (!sharedSecret || !constantTimeEquals(incoming.trim(), sharedSecret)) {
      return next(
        new HttpError(401, CODES.GATEWAY_SECRET_REJECTED, AUTH_FAILURE_MESSAGE),
      );
    }

    return next();
  };
}

module.exports = createGatewaySecretMiddleware;
