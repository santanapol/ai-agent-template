"use strict";

const express = require("express");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const logger = require("./config/logger");
const { pingDatabase } = require("./config/database");
const { successEnvelope, errorEnvelope } = require("./utils/envelope");
const CODES = require("./utils/error-codes");
const requestIdMiddleware = require("./middlewares/request-id.middleware");
const createGatewaySecretMiddleware = require("./middlewares/gateway-secret.middleware");
const duplicateHeaderGuard = require("./middlewares/duplicate-header.middleware");
const requiredUserContext = require("./middlewares/user-context.middleware");
const createRateLimitMiddleware = require("./middlewares/rate-limit.middleware");
const enforceAccept = require("./middlewares/accept.middleware");
const enforceContentType = require("./middlewares/content-type.middleware");
const errorHandler = require("./middlewares/error-handler.middleware");
const itemsRouter = require("./modules/items/items.route");
const meRouter = require("./modules/me/me.route");
const membersRouter = require("./modules/members/members.route");
const billingRouter = require("./modules/billing/billing.route");
const {
  httpMetricsMiddleware,
  metricsHandler,
} = require("./modules/metrics/metrics");

function createApp(env) {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ xFrameOptions: { action: "deny" } }));
  app.use(requestIdMiddleware);
  app.use(duplicateHeaderGuard);

  app.use((req, res, next) => {
    if (
      req.path === "/healthz" ||
      req.path === "/readyz" ||
      req.path === "/metrics"
    ) {
      return next();
    }
    return pinoHttp({
      logger,
      genReqId: (r) => r.id,
      customLogLevel(_req, res, err) {
        if (err) return "error";
        if (res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    })(req, res, next);
  });

  app.use(httpMetricsMiddleware);

  app.get("/healthz", (_req, res) => {
    res.status(200).json(
      successEnvelope({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    );
  });

  app.get("/readyz", async (req, res) => {
    try {
      await pingDatabase(1000);
      res.status(200).json(successEnvelope({ status: "ready" }));
    } catch (_error) {
      res.status(503).json(
        errorEnvelope({
          code: CODES.SERVICE_UNAVAILABLE,
          message: "Service dependencies are not ready",
          data: null,
          requestId: req.id,
        }),
      );
    }
  });

  app.get(
    "/metrics",
    createGatewaySecretMiddleware(env.gatewaySharedSecret),
    metricsHandler,
  );

  const apiV1 = express.Router();

  apiV1.use(createGatewaySecretMiddleware(env.gatewaySharedSecret));
  apiV1.use(requiredUserContext);
  apiV1.use(createRateLimitMiddleware());
  apiV1.use(enforceAccept);
  apiV1.use(enforceContentType);
  apiV1.use(
    express.json({
      limit: env.bodyLimit,
      strict: true,
    }),
  );

  apiV1.use("/me", meRouter);
  apiV1.use("/items", itemsRouter);
  apiV1.use("/ou/:ouId/branches/:branchId/members", membersRouter);
  apiV1.use("/ou/:ouId/branches/:branchId/billing", billingRouter);

  apiV1.use((req, res) => {
    res.status(404).json(
      errorEnvelope({
        code: CODES.NO_MATCHING_API_PATH,
        message: "No matching resource for this path",
        requestId: req.id,
      }),
    );
  });

  app.use("/api/v1", apiV1);

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
