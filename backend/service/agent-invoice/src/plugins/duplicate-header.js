import fp from "fastify-plugin";
import { findDuplicateCriticalHeader } from "../lib/critical-headers.js";

const DEFAULT_SKIP = ["/healthz", "/readyz", "/metrics"];

/**
 * Reject duplicate critical mesh headers (raw wire count + Fastify-coalesced arrays).
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ skipPaths?: string[] }} [options]
 */
async function duplicateHeaderGuard(fastify, options = {}) {
  const skipPaths = new Set(options.skipPaths ?? DEFAULT_SKIP);

  fastify.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (skipPaths.has(path)) return;

    const duplicateHeader = findDuplicateCriticalHeader(request);
    if (duplicateHeader) {
      return reply.status(400).send({
        success: false,
        code: "INVALID_HEADER",
        message: `Duplicate header detected: ${duplicateHeader}`,
        data: null,
        requestId: request.requestId,
      });
    }
  });
}

export default fp(duplicateHeaderGuard, {
  name: "agent-invoice-duplicate-header",
});
