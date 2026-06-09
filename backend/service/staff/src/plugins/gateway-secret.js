import fp from "fastify-plugin";
import nodeCrypto from "node:crypto";
import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

const AUTH_FAILURE_MESSAGE = "Authentication failed";

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return nodeCrypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export default fp(async function gatewaySecretGuard(fastify, options) {
  const sharedSecret = options.sharedSecret;

  fastify.addHook("onRequest", async (request, _reply) => {
    const incoming = request.headers["x-gateway-secret"];

    if (typeof incoming !== "string" || !incoming.trim()) {
      throw new HttpError(
        401,
        CODES.GATEWAY_SECRET_REJECTED,
        AUTH_FAILURE_MESSAGE,
      );
    }

    if (
      !sharedSecret ||
      !constantTimeEquals(incoming.trim(), sharedSecret.trim())
    ) {
      throw new HttpError(
        401,
        CODES.GATEWAY_SECRET_REJECTED,
        AUTH_FAILURE_MESSAGE,
      );
    }
  });
});
