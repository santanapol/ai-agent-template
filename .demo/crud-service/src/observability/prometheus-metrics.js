"use strict";

const client = require("prom-client");
const logger = require("../config/logger");

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

/**
 * @param {import('express').Request} req
 */
function routePattern(req) {
  const p = req.route && req.route.path ? String(req.route.path) : "";
  const base = req.baseUrl ? String(req.baseUrl) : "";
  if (!p && !base) return "OTHER";
  return `${base}${p}` || "OTHER";
}

/**
 * @param {import('express').Request} req
 */
function shouldSkipHttpMetrics(req) {
  const u = req.path || "";
  return u === "/healthz" || u === "/readyz" || u === "/metrics";
}

function httpMetricsMiddleware(req, res, next) {
  if (shouldSkipHttpMetrics(req)) return next();
  const start = process.hrtime.bigint();
  const method = req.method;
  res.on("finish", () => {
    const route = routePattern(req);
    const status = String(res.statusCode);
    const deltaMs = Number(process.hrtime.bigint() - start) / 1e6;
    try {
      httpRequestDurationMs.observe(
        { method, route, status_code: status },
        deltaMs,
      );
      httpRequestsTotal.inc({ method, route, status_code: status });
    } catch (err) {
      logger.warn({ err }, "metrics observe failed");
    }
  });
  next();
}

async function metricsHandler(_req, res, next) {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  httpMetricsMiddleware,
  metricsHandler,
  httpRequestDurationMs,
  httpRequestsTotal,
};
