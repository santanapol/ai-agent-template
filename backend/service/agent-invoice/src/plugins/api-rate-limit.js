import fp from 'fastify-plugin';

import { resolveRequestId } from '../lib/request-id.js';
import { sendError } from '../lib/response.js';

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 60);

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

/**
 * @param {string} key
 * @returns {boolean} true when allowed
 */
function consume(key) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS;
}

async function apiRateLimitPlugin(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (!path.startsWith('/api/v1/invoices')) {
      return;
    }

    const key = request.userContext?.id ?? request.ip;
    if (!consume(String(key))) {
      return sendError(reply, {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        requestId: resolveRequestId(request.headers['x-request-id']),
      });
    }
  });
}

export default fp(apiRateLimitPlugin, { name: 'api-rate-limit' });
