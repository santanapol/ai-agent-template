import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";

import logger from "./config/logger.js";
import { errorEnvelope } from "./lib/envelope.js";
import CODES from "./lib/error-codes.js";

import duplicateHeaderGuard from "./plugins/duplicate-header.js";
import gatewaySecretGuard from "./plugins/gateway-secret.js";
import userContextGuard from "./plugins/user-context.js";
import errorHandler from "./plugins/error-handler.js";
import metricsPlugin from "./plugins/metrics.js";

import meRoutes from "./modules/me/me.route.js";
import itemsRoutes from "./modules/items/items.route.js";
import { registerHealthRoutes } from "./routes/health.route.js";

export default async function createApp(env) {
  const startedAtMs = Date.now();
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    requestIdHeader: "x-request-id",
    genReqId: (req) => {
      const headerValue = req.headers["x-request-id"];
      return typeof headerValue === "string" && headerValue.trim()
        ? headerValue
        : randomUUID();
    },
    bodyLimit: 1048576, // 1mb limit
  });

  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(duplicateHeaderGuard);
  await app.register(errorHandler);
  await app.register(metricsPlugin);

  await registerHealthRoutes(app, { startedAtMs });

  // Protected /api/v1 routes
  await app.register(
    async function (apiV1) {
      await apiV1.register(gatewaySecretGuard, {
        sharedSecret: env.gatewaySharedSecret,
      });
      await apiV1.register(userContextGuard);
      await apiV1.register(rateLimit, {
        max: 1000,
        timeWindow: "1 minute",
        errorResponseBuilder: function (request, _context) {
          return errorEnvelope({
            code: CODES.TOO_MANY_REQUESTS,
            message: "Too many requests, please try again later.",
            requestId: request.id,
          });
        },
      });

      apiV1.register(meRoutes, { prefix: "/me" });
      apiV1.register(itemsRoutes, { prefix: "/items" });

      apiV1.setNotFoundHandler((request, reply) => {
        reply.status(404).send(
          errorEnvelope({
            code: CODES.NO_MATCHING_API_PATH,
            message: "No matching resource for this path",
            requestId: request.id,
          }),
        );
      });
    },
    { prefix: "/api/v1" },
  );

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      errorEnvelope({
        code: CODES.NO_MATCHING_API_PATH,
        message: "No matching resource for this path",
        requestId: request.id,
      }),
    );
  });

  return app;
}
