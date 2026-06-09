import fp from "fastify-plugin";

import { resolveRequestId } from "../lib/request-id.js";
import { sendError } from "../lib/response.js";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 60);
const CLEANUP_INTERVAL_MS = Math.max(WINDOW_MS, 60_000);

/**
 * Creates an isolated rate-limiter instance with its own bucket state.
 * Calling this twice yields two independent limiters — no shared module state.
 *
 * @param {{ maxRequests?: number, windowMs?: number }} [opts]
 */
export function createRateLimiter({
  maxRequests = MAX_REQUESTS,
  windowMs = WINDOW_MS,
} = {}) {
  const buckets = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }

  function consume(key) {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= maxRequests;
  }

  return { consume, cleanup };
}

async function apiRateLimitPlugin(fastify) {
  const { consume, cleanup } = createRateLimiter();

  // Periodic cleanup to prevent memory leak
  const cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  fastify.addHook("onClose", async () => {
    clearInterval(cleanupTimer);
  });

  // preHandler runs AFTER all onRequest hooks (including those in child plugins
  // that populate request.userContext). This ensures per-user rate limiting works.
  fastify.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (!path.startsWith("/api/v1/invoices")) {
      return;
    }

    const key = request.userContext?.id ?? request.ip;
    if (!consume(String(key))) {
      return sendError(reply, {
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
        requestId: resolveRequestId(request.headers["x-request-id"]),
      });
    }
  });
}

export default fp(apiRateLimitPlugin, { name: "api-rate-limit" });
