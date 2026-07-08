import { pingDatabase } from "../config/database.js";

const PROBLEM_TYPE_BASE = "https://problems.zero-platform.internal/service";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ startedAtMs: number }} opts
 */
export async function registerHealthRoutes(app, opts) {
  const { startedAtMs } = opts;

  app.get("/healthz", async () => ({
    status: "ok",
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
}
