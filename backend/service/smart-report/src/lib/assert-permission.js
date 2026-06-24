import { anyPermissionMatches } from "./permission-match.js";
import { HttpError } from "./http-error.js";
import CODES from "./error-codes.js";

/**
 * @param {{ permissions?: string[] }} userContext
 * @param {string} actionKey
 */
export function assertPermission(userContext, actionKey) {
  if (anyPermissionMatches(userContext?.permissions ?? [], actionKey)) {
    return;
  }

  throw new HttpError(
    403,
    CODES.PERMISSION_DENIED,
    `Requires permission: ${actionKey}`,
  );
}
