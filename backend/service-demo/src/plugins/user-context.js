import fp from "fastify-plugin";
import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

function readHeader(request, name) {
  const value = request.headers[name];
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export default fp(async function userContextGuard(fastify) {
  fastify.addHook("onRequest", async (request, _reply) => {
    const userId = readHeader(request, "x-user-id");
    const userOu = readHeader(request, "x-user-ou");
    const userBranch = readHeader(request, "x-user-branch");

    if (!userId || !userOu || !userBranch) {
      throw new HttpError(
        403,
        CODES.MISSING_GATEWAY_USER_CONTEXT,
        "Missing required user context headers",
      );
    }

    request.userContext = {
      userId,
      ouId: userOu,
      branchId: userBranch,
    };
  });
});
