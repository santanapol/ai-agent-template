import fp from "fastify-plugin";
import { getMetricsRegistry } from "../lib/utils/metrics.js";

export default fp(async function metricsPlugin(fastify, options) {
  const enabled = Boolean(options?.enabled);
  if (!enabled) {
    return;
  }

  const registry = getMetricsRegistry();
  fastify.get("/metrics", async (_request, reply) => {
    reply.header("content-type", registry.contentType);
    return registry.metrics();
  });
});
