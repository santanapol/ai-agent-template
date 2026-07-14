import { anyPermissionMatches } from "./permission-match.js";
import { sendError } from "./response.js";

/**
 * Fastify preHandler gating a route on a permission key from
 * `request.userContext.permissions` (populated by the `user-context` plugin
 * from the gateway-forwarded `x-user-permissions` header).
 *
 * @param {string} actionKey
 */
export function requirePermission(actionKey) {
  return async (request, reply) => {
    const permissions = request.userContext?.permissions ?? [];

    if (!anyPermissionMatches(permissions, actionKey)) {
      return sendError(reply, {
        statusCode: 403,
        code: "PERMISSION_DENIED",
        message: `Requires permission: ${actionKey}`,
        requestId: request.requestId ?? "unknown",
      });
    }
  };
}
