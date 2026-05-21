"use strict";

const nodeCrypto = require("node:crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const CODES = require("../utils/error-codes");
const { errorEnvelope } = require("../utils/envelope");

function hashSecret(secret) {
  return nodeCrypto.createHash("sha256").update(secret).digest("hex");
}

function createRateLimitMiddleware() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: (req) => {
      if (req.method === "GET" || req.method === "HEAD") {
        return 200;
      }
      return 30;
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.userContext && req.userContext.userId) {
        return `user:${req.userContext.userId}`;
      }

      const secret = req.headers["x-gateway-secret"];
      if (typeof secret === "string" && secret.trim()) {
        return `gw:${hashSecret(secret.trim())}`;
      }

      return ipKeyGenerator(req.ip);
    },
    skip: (req) =>
      req.path === "/healthz" ||
      req.path === "/readyz" ||
      req.path === "/metrics",
    handler: (req, res) => {
      res.status(429).json(
        errorEnvelope({
          code: CODES.TOO_MANY_REQUESTS,
          message: "Rate limit exceeded",
          requestId: req.id,
        }),
      );
    },
  });
}

module.exports = createRateLimitMiddleware;
