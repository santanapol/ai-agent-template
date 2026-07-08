import { pingDatabase } from "../config/database.js";
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

  app.get("/readyz", async (_request, reply) => {
    const dependencies = await Promise.all([
      pingDatabase()
        .then(() => ({ name: "database", status: "ok" }))
        .catch(() => ({ name: "database", status: "error" })),
      pingReadDatabase()
        .then(() => ({ name: "database-read", status: "ok" }))
        .catch(() => ({ name: "database-read", status: "error" })),
    ]);

    const allOk = dependencies.every((dep) => dep.status === "ok");
    if (!allOk) reply.code(503);

    return {
      status: allOk ? "ok" : "error",
      timestamp: new Date().toISOString(),
      dependencies,
    };
  });
}
