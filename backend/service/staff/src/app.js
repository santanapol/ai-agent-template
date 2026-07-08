import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { randomUUID } from "node:crypto";

import logger from "./config/logger.js";
import { setRuntimeEnv } from "./config/runtime-env.js";
import CODES from "./lib/error-codes.js";
import { errorEnvelope } from "./lib/envelope.js";

import duplicateHeaderGuard from "./plugins/duplicate-header.js";
import gatewaySecretGuard from "./plugins/gateway-secret.js";
import userContextGuard from "./plugins/user-context.js";
import errorHandler from "./plugins/error-handler.js";
import metricsPlugin from "./plugins/metrics.js";
import profileRoutes from "./modules/profiles/profiles.route.js";
import { registerHealthRoutes } from "./routes/health.route.js";

function parseBodyLimitBytes(value) {
  const str = String(value ?? "1mb")
    .trim()
    .toLowerCase();
  if (str.endsWith("mb")) return Math.round(parseFloat(str) * 1024 * 1024);
  if (str.endsWith("kb")) return Math.round(parseFloat(str) * 1024);
  const n = parseInt(str, 10);
  return Number.isFinite(n) && n > 0 ? n : 1048576;
}

/**
 * @param {import('./config/env.js').readEnv extends () => infer R ? R : never} env
 */
export default async function createApp(env) {
  setRuntimeEnv(env);
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
    bodyLimit: parseBodyLimitBytes(env.bodyLimit),
  });

  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(duplicateHeaderGuard);
  await app.register(errorHandler);
  await app.register(metricsPlugin, { enabled: env.metricsEnabled });

  await registerHealthRoutes(app, {
    appName: env.appName,
    startedAtMs,
  });

  await app.register(
    async function staffApiV1(api) {
      await api.register(gatewaySecretGuard, {
        sharedSecret: env.gatewaySharedSecret,
      });
      await api.register(userContextGuard);

      await api.register(import("@fastify/rate-limit"), {
        max: 60,
        timeWindow: "1 minute",
        keyGenerator: (req) =>
          `${req.userContext?.userId ?? req.ip}:${req.routeOptions?.url ?? req.url}`,
        errorResponseBuilder: (_req, context) => ({
          success: false,
          code: CODES.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
          data: null,
        }),
      });

      await api.register(profileRoutes, { prefix: "/profiles" });

      api.setNotFoundHandler((request, reply) => {
        reply.status(404).send(
          errorEnvelope({
            code: CODES.NO_MATCHING_API_PATH,
            message: "No matching resource for this path",
            requestId: request.id,
          }),
        );
      });
    },
    { prefix: "/api/v1/staff" },
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
