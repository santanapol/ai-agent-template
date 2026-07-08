import fp from "fastify-plugin";
import { secretsMatch } from "../lib/secret-compare.js";

const DEFAULT_SKIP = ["/healthz", "/readyz", "/metrics"];

/**
 * Require matching `x-gateway-secret` (except ops probes).
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{
 *   sharedSecret?: string
 *   skipPaths?: string[]
 * }} [options]
 */
async function gatewaySecretGuard(fastify, options = {}) {
  const skipPaths = new Set(options.skipPaths ?? DEFAULT_SKIP);
  const sharedSecret =
    options.sharedSecret ?? process.env.GATEWAY_SHARED_SECRET;

  fastify.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0];
    if (skipPaths.has(path)) return;

    const secret = request.headers["x-gateway-secret"];
    if (
      !secret ||
      !sharedSecret ||
      !secretsMatch(String(secret), sharedSecret)
    ) {
      return reply.status(401).send({
        success: false,
        code: "GATEWAY_SECRET_REJECTED",
        message: "Authentication failed.",
        data: null,
        requestId: request.requestId,
      });
    }
  });
}

export default fp(gatewaySecretGuard, {
  name: "agent-invoice-gateway-secret",
});
