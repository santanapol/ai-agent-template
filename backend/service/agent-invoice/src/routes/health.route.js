import { pingInvoiceDatabase } from "../config/database-invoice.js";
import { pingReadDatabase } from "../config/database-read.js";

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function registerHealthRoutes(app) {
  app.get("/healthz", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  }));

  app.get("/readyz", async (request, reply) => {
    const dependencies = [];

    try {
      await app.db.command({ ping: 1 });
      dependencies.push({ name: "database", status: "ok" });
    } catch {
      dependencies.push({ name: "database", status: "error" });
    }

    try {
      await pingInvoiceDatabase();
      dependencies.push({ name: "invoice-database", status: "ok" });
    } catch {
      dependencies.push({ name: "invoice-database", status: "error" });
    }

    try {
      await pingReadDatabase();
      dependencies.push({ name: "read-database", status: "ok" });
    } catch {
      dependencies.push({ name: "read-database", status: "error" });
    }

    const hasError = dependencies.some((dep) => dep.status === "error");
    if (hasError) {
      return reply.status(503).send({
        success: false,
        code: "SERVICE_UNAVAILABLE",
        message: "Readiness check failed.",
        data: { dependencies },
        requestId: request.requestId,
      });
    }

    return { status: "ok", dependencies };
  });
}
