import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { randomUUID } from "node:crypto";

import logger from "./config/logger.js";
import { setRuntimeEnv } from "./config/runtime-env.js";
import CODES from "./lib/error-codes.js";
import { errorEnvelope, successEnvelope } from "./lib/envelope.js";

import duplicateHeaderGuard from "./plugins/duplicate-header.js";
import gatewaySecretGuard from "./plugins/gateway-secret.js";
import userContextGuard from "./plugins/user-context.js";
import errorHandler from "./plugins/error-handler.js";
import metricsPlugin from "./plugins/metrics.js";
import { pingDatabase } from "./config/database.js";
import profileRoutes from "./modules/profiles/profiles.route.js";

const PROBLEM_TYPE_BASE = "https://problems.zero-platform.internal/staff";

function parseBodyLimitBytes(value) {
  const str = String(value ?? "1mb").trim().toLowerCase();
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

  app.get("/healthz", async () => ({
    status: "ok",
    service: env.appName,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAtMs) / 1000),
  }));

  app.get("/readyz", async (_request, reply) => {
    try {
      await pingDatabase(1000);
      return {
        status: "ok",
        dependencies: [{ name: "database", status: "ok" }],
      };
    } catch (_error) {
      return reply
        .code(503)
        .type("application/problem+json")
        .send({
          type: `${PROBLEM_TYPE_BASE}/not-ready`,
          title: "Service Unavailable",
          status: 503,
          detail: "Readiness check failed.",
          code: "SERVICE_NOT_READY",
        });
    }
  });

  await app.register(
    async function staffApiV1(api) {
      await api.register(gatewaySecretGuard, {
        sharedSecret: env.gatewaySharedSecret,
      });
      await api.register(userContextGuard);

      /** Internal probe — removed when profiles routes land (T08+). */
      api.get("/_mesh-probe", async (request) => {
        const ctx = request.userContext;
        return successEnvelope({
          userId: ctx.userId,
          ouId: ctx.ouId,
          branchId: ctx.branchId,
          role: ctx.role,
          ouObjectId: ctx.ouObjectId.toString(),
          branchObjectId: ctx.branchObjectId.toString(),
        });
      });

      api.post(
        "/_validate-probe",
        {
          schema: {
            body: {
              type: "object",
              required: ["code"],
              additionalProperties: false,
              properties: {
                code: { type: "string", minLength: 1 },
              },
            },
          },
        },
        async () => successEnvelope({ ok: true }),
      );

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
