import fp from 'fastify-plugin';

import { sendError } from '../lib/response.js';

function userContextPlugin(fastify, options) {
  const { skipPaths = [], requireBranch = true } = options;

  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (skipPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return;
    }

    const ouId = headerValue(request.headers['x-user-ou']);
    const branchId = headerValue(request.headers['x-user-branch']);
    const userId = headerValue(request.headers['x-user-id']);
    const role = headerValue(request.headers['x-user-role']);
    const homeBranchId = headerValue(request.headers['x-user-home-branch']);

    if (!ouId || (requireBranch && !branchId)) {
      return sendError(reply, {
        statusCode: 403,
        code: 'MISSING_GATEWAY_USER_CONTEXT',
        message: 'Required user context is missing',
        requestId: request.requestId ?? 'unknown',
      });
    }

    request.userContext = {
      ouId,
      branchId: branchId ?? null,
      userId: userId ?? null,
      role: role ?? null,
      homeBranchId: homeBranchId ?? null,
    };
  });
}

/**
 * @param {string | string[] | undefined} value
 * @returns {string | null}
 */
function headerValue(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default fp(userContextPlugin, {
  name: 'user-context',
});
