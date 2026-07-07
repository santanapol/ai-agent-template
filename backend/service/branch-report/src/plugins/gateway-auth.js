import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

import fp from 'fastify-plugin';

import { sendError } from '../lib/response.js';

/**
 * @param {unknown} provided
 * @param {string} expected
 */
function secretsMatch(provided, expected) {
  if (typeof provided !== 'string') {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function gatewayAuthPlugin(fastify, options) {
  const { secret, skipPaths = [] } = options;

  if (!secret) {
    throw new Error('[gateway-auth] GATEWAY_SHARED_SECRET is required');
  }

  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (skipPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }

    const provided = request.headers['x-gateway-secret'];
    if (!secretsMatch(provided, secret)) {
      return sendError(reply, {
        statusCode: 401,
        code: 'GATEWAY_SECRET_REJECTED',
        message: 'Authentication failed',
        requestId: request.requestId ?? 'unknown',
      });
    }
  });
}

export default fp(gatewayAuthPlugin, {
  name: 'gateway-auth',
});
