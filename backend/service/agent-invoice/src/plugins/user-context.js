import fp from "fastify-plugin";
import { isValidRole } from "@zero-platform/roles";
import { isValidObjectId } from "../lib/object-id.js";
import { resolveRequestId } from "../lib/request-id.js";
import { sendError } from "../lib/response.js";

function readHeader(request, name) {
  const value = request.headers[name];
  return typeof value === "string" ? value.trim() : "";
}

export default fp(async function userContextPlugin(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    if (request.url === "/healthz" || request.url === "/readyz") {
      return;
    }

    const requestId = resolveRequestId(request.headers["x-request-id"]);
    const userId = readHeader(request, "x-user-id");
    const userOu = readHeader(request, "x-user-ou");
    const userBranch = readHeader(request, "x-user-branch");
    const userRole = readHeader(request, "x-user-role");
    const rawPermissions = readHeader(request, "x-user-permissions");

    if (!userId || !userOu || !userBranch || !userRole) {
      return sendError(reply, {
        statusCode: 403,
        code: "MISSING_GATEWAY_USER_CONTEXT",
        message: "Required user context is missing",
        requestId,
      });
    }

    for (const value of [userOu, userBranch]) {
      if (!isValidObjectId(value)) {
        return sendError(reply, {
          statusCode: 403,
          code: "INVALID_USER_CONTEXT",
          message: "Invalid user context",
          requestId,
        });
      }
    }

    if (!isValidRole(userRole)) {
      return sendError(reply, {
        statusCode: 403,
        code: "INVALID_USER_CONTEXT",
        message: "Invalid x-user-role",
        requestId,
      });
    }

    request.userContext = {
      id: userId,
      ouId: userOu,
      branchId: userBranch,
      role: userRole,
      permissions: rawPermissions === "" ? [] : rawPermissions.split(","),
    };
  });
});
