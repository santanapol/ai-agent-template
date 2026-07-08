import Fastify from "fastify";
import { randomUUID } from "node:crypto";

import { registerErrorHandler } from "./lib/error-handler.js";
import { errorEnvelope } from "./lib/envelope.js";
import CODES from "./lib/error-codes.js";
import duplicateHeaderGuard from "./plugins/duplicate-header.js";
import gatewaySecretGuard from "./plugins/gateway-secret.js";
import userContextGuard from "./plugins/user-context.js";
import reportsRoute from "./modules/reports/reports.route.js";
import { registerBasicMetrics } from "../../../shared/fastify-metrics/basic-metrics.js";
import { registerHealthRoutes } from "./routes/health.route.js";

const REDACT_PATHS = [
  'req.headers["x-gateway-secret"]',
  "req.headers.authorization",
  "req.headers.cookie",
];

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
  // (clients commonly send this on bodyless DELETE/POST actions).
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

  await app.register(duplicateHeaderGuard);
  registerErrorHandler(app);

  await registerHealthRoutes(app);
  registerBasicMetrics(app, { startedAtMs, serviceName: "smart-report" });

  await app.register(
    async function (apiSmartReports) {
      await apiSmartReports.register(gatewaySecretGuard);
      await apiSmartReports.register(userContextGuard);
      await apiSmartReports.register(reportsRoute);

      apiSmartReports.setNotFoundHandler((request, reply) => {
        reply.status(404).send(
          errorEnvelope({
            code: CODES.NO_MATCHING_API_PATH,
            message: "No matching resource for this path",
            requestId: request.requestId,
          }),
        );
      });
    },
    { prefix: "/api/v1/smart-reports" },
  );

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      errorEnvelope({
        code: CODES.NO_MATCHING_API_PATH,
        message: "No matching resource for this path",
        requestId: request.requestId,
      }),
    );
  });

  return app;
}
