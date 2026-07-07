import { getRuntimeEnv } from "../../config/runtime-env.js";
import logger from "../../config/logger.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { anyPermissionMatches } from "../../lib/permission-match.js";
import { isAdminRole, OU_WIDE_STAFF_ROLES } from "@zero-platform/roles";

const LIST_QUERY_KEYS = Object.freeze([
  "q",
  "page",
  "limit",
  "sort",
  "status",
  "branch_id",
]);

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string, permissions: string[] }} userContext
 * @param {string} actionKey
 * @param {object} [options]
 * @param {function} [options.legacyRoleCheck]
 * @param {{ warn?: function }} [options.log] - optional request-scoped logger; falls back to module-level logger
 */
export function assertPermission(
  userContext,
  actionKey,
  { legacyRoleCheck, log } = {},
) {
  if (anyPermissionMatches(userContext.permissions, actionKey)) {
    return;
  }

  const env = getRuntimeEnv();
  const mode = env.permissionMode || "dual";
  if (mode === "dual" && legacyRoleCheck?.(userContext)) {
    const effectiveLog = log ?? logger;
    effectiveLog.warn(
      { action_key: actionKey, role: userContext.role },
      "permission dual-check fallback used",
    );
    return;
  }

  throw new HttpError(
    403,
    CODES.PERMISSION_DENIED,
    `Requires permission: ${actionKey}`,
  );
}

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertAdminRole(userContext, { log } = {}) {
  assertPermission(userContext, "profiles:create", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
    log,
  });
}

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertPlatformAdmin(userContext, { log } = {}) {
  assertPermission(userContext, "roles:assign", {
    legacyRoleCheck: (ctx) => ctx.role === "platform_admin",
    log,
  });
}

/**
 * @param {import('mongodb').Document} authUser
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertAdminCanLinkUser(authUser, userContext) {
  const userOu = authUser.ou_id.toString();
  const userBranch = authUser.branch_id.toString();

  if (userOu !== userContext.ouId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Target user is outside caller organizational unit",
    );
  }

  if (
    userContext.role === "branch_admin" &&
    userBranch !== userContext.branchId
  ) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Target user is outside caller branch scope",
    );
  }
}

/**
 * @param {import('mongodb').Document} authUser
 */
export function tenantContextFromAuthUser(authUser, actorUserId) {
  return {
    userId: actorUserId,
    ouId: authUser.ou_id.toString(),
    branchId: authUser.branch_id.toString(),
  };
}

/**
 * Resolve Mongo list scope for GET /profiles (admin list mode).
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {{ branch_id?: string }} [query]
 * @returns {{ ouId: string, branchId?: string }}
 */
export function resolveListScope(userContext, query = {}, { log } = {}) {
  assertPermission(userContext, "profiles:list", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
    log,
  });

  const scope = { ouId: userContext.ouId };

  if (userContext.role === "branch_admin") {
    const requestedBranch = query.branch_id;
    if (requestedBranch && requestedBranch !== userContext.branchId) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "branch_id filter is outside caller branch scope",
      );
    }
    scope.branchId = userContext.branchId;
    return scope;
  }

  if (OU_WIDE_STAFF_ROLES.has(userContext.role)) {
    scope.branchId = query.branch_id ?? userContext.branchId;
    return scope;
  }

  return scope;
}

/**
 * Branch used for self-profile tenant checks (home branch when gateway forwards it).
 * @param {{ branchId: string, homeBranchId?: string }} userContext
 */
export function callerSelfBranchId(userContext) {
  return userContext.homeBranchId ?? userContext.branchId;
}

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} targetUserId
 * @returns {{ ouId: string, branchId?: string }}
 */
export function resolveLookupScope(userContext, targetUserId, { log } = {}) {
  if (targetUserId === userContext.userId) {
    // OU-wide roles: profile lives at home branch; scope by OU only so My Profile
    // works when active branch differs even if x-user-home-branch is not forwarded.
    if (OU_WIDE_STAFF_ROLES.has(userContext.role)) {
      return { ouId: userContext.ouId };
    }
    return {
      ouId: userContext.ouId,
      branchId: callerSelfBranchId(userContext),
    };
  }

  assertPermission(userContext, "profiles:lookup", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
    log,
  });

  if (OU_WIDE_STAFF_ROLES.has(userContext.role)) {
    return { ouId: userContext.ouId };
  }

  return {
    ouId: userContext.ouId,
    branchId: userContext.branchId,
  };
}

/**
 * Assert caller may access a profile document (API shape).
 * @param {{ user_id: string, ou_id: string, branch_id: string }} profile
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} actionKey The required permission action key
 */
export function assertProfileScope(
  profile,
  userContext,
  actionKey,
  { log } = {},
) {
  if (profile.user_id === userContext.userId) {
    if (profile.ou_id !== userContext.ouId) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Profile tenant does not match caller context",
      );
    }
    if (!OU_WIDE_STAFF_ROLES.has(userContext.role)) {
      const selfBranch = callerSelfBranchId(userContext);
      if (profile.branch_id !== selfBranch) {
        throw new HttpError(
          403,
          CODES.INVALID_USER_CONTEXT,
          "Profile tenant does not match caller context",
        );
      }
    }
    return;
  }

  assertPermission(userContext, actionKey, {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
    log,
  });

  if (profile.ou_id !== userContext.ouId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Profile is outside caller organizational unit",
    );
  }

  if (
    userContext.role === "branch_admin" &&
    profile.branch_id !== userContext.branchId
  ) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Profile is outside caller branch scope",
    );
  }
}

/**
 * Reject mixing lookup `user_id` with list query parameters.
 * @param {Record<string, unknown>} query
 */
export function assertLookupQueryExclusive(query) {
  if (!query.user_id) {
    return;
  }

  for (const key of LIST_QUERY_KEYS) {
    if (query[key] !== undefined && query[key] !== null && query[key] !== "") {
      throw new HttpError(
        400,
        CODES.INVALID_PARAM,
        "user_id lookup cannot be combined with list query parameters",
      );
    }
  }
}

/**
 * Mongo scope for GET /profiles/{id} before profile is loaded.
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @returns {{ ouId: string, branchId?: string }}
 */
export function resolveGetByIdScope(userContext) {
  if (OU_WIDE_STAFF_ROLES.has(userContext.role)) {
    return { ouId: userContext.ouId };
  }

  return {
    ouId: userContext.ouId,
    branchId: userContext.branchId,
  };
}

/**
 * Admin lifecycle (archive/restore) — not own profile.
 * @param {{ user_id: string }} profile
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertAdminLifecycleAccess(
  profile,
  userContext,
  actionKey,
  { log } = {},
) {
  if (profile.user_id === userContext.userId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Cannot archive or restore your own profile",
    );
  }

  assertProfileScope(profile, userContext, actionKey, { log });
}
