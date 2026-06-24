import fp from "fastify-plugin";

import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

const VALID_ROLES = new Set(["staff", "branch_admin", "platform_admin"]);

function readHeader(request, name) {
  const value = request.headers[name];
  return typeof value === "string" ? value.trim() : "";
}

export default fp(async function userContextGuard(fastify) {
  fastify.addHook("onRequest", async (request) => {
    const userId = readHeader(request, "x-user-id");
    const userOu = readHeader(request, "x-user-ou");
    const userBranch = readHeader(request, "x-user-branch");
    const role = readHeader(request, "x-user-role");

    if (!userId || !userOu || !userBranch || !role) {
      throw new HttpError(
        403,
        CODES.MISSING_GATEWAY_USER_CONTEXT,
        "Missing required user context headers",
      );
    }

    if (!VALID_ROLES.has(role)) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Invalid x-user-role",
      );
    }

    // role/ouId/branchId are validated but intentionally not used to scope
    // report access — see "Known Limitations / Accepted Risks" in
    // _mission-control/SPEC.md.
    request.userContext = {
      userId,
      ouId: userOu,
      branchId: userBranch,
      role,
      permissions:
        readHeader(request, "x-user-permissions") === ""
          ? []
          : readHeader(request, "x-user-permissions").split(","),
    };
  });
});
