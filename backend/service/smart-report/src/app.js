import Fastify from "fastify";
import { randomUUID } from "node:crypto";

const REDACT_PATHS = [
  'req.headers["x-gateway-secret"]',
  "req.headers.authorization",
  "req.headers.cookie",
];

export default async function buildApp(opts = {}) {
  const isDev = process.env.NODE_ENV !== "production";

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

  app.get("/healthz", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  }));

  return app;
}
