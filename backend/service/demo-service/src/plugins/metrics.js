import fp from "fastify-plugin";
import client from "prom-client";

export default fp(async function metricsPlugin(fastify, _options) {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  const httpRequestDurationMs = new client.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "status_code"],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    registers: [register],
  });

  const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  });

  fastify.addHook("onResponse", (request, reply, done) => {
    const u = request.routeOptions.url || request.routerPath || request.url;
    if (u === "/healthz" || u === "/readyz" || u === "/metrics") {
      return done();
    }
    const method = request.method;
    const route = u || "OTHER";
    const status = String(reply.statusCode);
    const deltaMs = reply.getResponseTime();

    try {
      httpRequestDurationMs.observe(
        { method, route, status_code: status },
        deltaMs,
      );
      httpRequestsTotal.inc({ method, route, status_code: status });
    } catch (err) {
      request.log.warn({ err }, "metrics observe failed");
    }
    done();
  });

  fastify.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
});
