import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import dbPlugin from "./plugins/db.plugin.js";
import mongodbRead from "./plugins/mongodb-read.js";
import mongodbInvoice from "./plugins/mongodb-invoice.js";
import apiRateLimit from "./plugins/api-rate-limit.js";
import duplicateHeaderGuard from "./plugins/duplicate-header.js";
import gatewaySecretGuard from "./plugins/gateway-secret.js";
import agentFeesRoute from "./modules/agent-fees/agent-fees.route.js";
import masterDataRoute from "./modules/agent-fees/master-data.route.js";
import agentsRoute from "./modules/agents/agents.route.js";
import invoicesRoute from "./modules/invoices/agent-invoices.route.js";
import userContextPlugin from "./plugins/user-context.js";
import { registerBasicMetrics } from "../../../shared/fastify-metrics/basic-metrics.js";
import { registerHealthRoutes } from "./routes/health.route.js";

const REDACT_PATHS = [
  'req.headers["x-gateway-secret"]',
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.token",
];

const PUBLIC_PATHS = ["/healthz", "/readyz", "/metrics"];

export default async function buildApp(opts = {}) {
  const isDev = process.env.NODE_ENV !== "production";
  const startedAtMs = Date.now();

  const app = Fastify({
    logger: {
      level: isDev ? "info" : "warn",
      redact: REDACT_PATHS,
    },
    ...opts,
  });

  // x-request-id propagation — generate if missing
  app.addHook("onRequest", async (request, reply) => {
    const requestId = request.headers["x-request-id"] || randomUUID();
    request.requestId = requestId;
    reply.header("x-request-id", requestId);
  });

  // Allow an empty body on `Content-Type: application/json` requests
  // (clients commonly send this on bodyless DELETE actions).
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      if (body === "") {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        error.statusCode = 400;
        done(error, undefined);
      }
    },
  );

  await app.register(duplicateHeaderGuard, { skipPaths: PUBLIC_PATHS });
  await app.register(gatewaySecretGuard, { skipPaths: PUBLIC_PATHS });

  // Global error handler — normalise Fastify validation errors to response envelope
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId;

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        code: "INVALID_PARAM",
        message: error.message,
        data: null,
        requestId,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      code: "INTERNAL_ERROR",
      message: "An internal error occurred.",
      data: null,
      requestId,
    });
  });

  // Plugins
  await app.register(dbPlugin);
  await app.register(mongodbRead);
  await app.register(mongodbInvoice);
  await app.register(apiRateLimit);
  await app.register(userContextPlugin);

  await registerHealthRoutes(app);
  registerBasicMetrics(app, { startedAtMs, serviceName: "agent-invoice" });

  // Routes
  await app.register(agentsRoute, { prefix: "/api/v1/agent-invoice/agents" });
  await app.register(agentFeesRoute, {
    prefix: "/api/v1/agent-invoice/agents",
  });
  await app.register(masterDataRoute, {
    prefix: "/api/v1/agent-invoice/master-data",
  });
  await app.register(invoicesRoute);

  return app;
}
