import fp from "fastify-plugin";

import { secretsMatch } from "../lib/secret-compare.js";
import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

export default fp(async function gatewaySecretGuard(fastify) {
  fastify.addHook("onRequest", async (request) => {
    const provided = request.headers["x-gateway-secret"];

    if (
      !secretsMatch(
        typeof provided === "string" ? provided : undefined,
        process.env.GATEWAY_SHARED_SECRET,
      )
    ) {
      throw new HttpError(
        401,
        CODES.GATEWAY_SECRET_REJECTED,
        "Authentication failed.",
      );
    }
  });
});
