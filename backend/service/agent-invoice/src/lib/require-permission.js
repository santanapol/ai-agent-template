import { anyPermissionMatches } from "./permission-match.js";
import { resolveRequestId } from "./request-id.js";
import { sendError } from "./response.js";

/**
 * @param {string} actionKey
 */
export function requirePermission(actionKey) {
  return async (request, reply) => {
    const requestId = resolveRequestId(request.headers["x-request-id"]);
    const permissions = request.userContext?.permissions ?? [];

    if (!anyPermissionMatches(permissions, actionKey)) {
      return sendError(reply, {
        statusCode: 403,
        code: "PERMISSION_DENIED",
        message: `Requires permission: ${actionKey}`,
        requestId,
      });
    }
  };
}
