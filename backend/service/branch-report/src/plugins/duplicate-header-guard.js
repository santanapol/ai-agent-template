import fp from "fastify-plugin";

import { findDuplicateCriticalHeader } from "../lib/critical-headers.js";
import { sendError } from "../lib/response.js";

function duplicateHeaderGuardPlugin(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    const duplicate = findDuplicateCriticalHeader(request);
    if (!duplicate) {
      return;
    }

    return sendError(reply, {
      statusCode: 400,
      code: "INVALID_HEADER",
      message: `Duplicate header: ${duplicate}`,
      requestId: request.requestId ?? "unknown",
    });
  });
}

export default fp(duplicateHeaderGuardPlugin, {
  name: "duplicate-header-guard",
});
