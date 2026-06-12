import { getRuntimeEnv } from "../../config/runtime-env.js";
import logger from "../../config/logger.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../lib/audit/audit-events.js";
import { writeAuditEvent } from "../../lib/audit/audit-writer.js";
import { getAuthInternalClient } from "../../lib/clients/auth-internal.client.js";
import { decodeIfMatch } from "../../lib/etag.js";
import { incrementAuthRevokePendingTotal } from "../../lib/utils/metrics.js";
import {
  normalizePatchFields,
  normalizeProfileFields,
  normalizeUsername,
} from "../../lib/utils/normalize.js";
import * as repository from "./profiles.repository.js";
import { anyPermissionMatches } from "../../lib/permission-match.js";

export const ADMIN_ROLES = Object.freeze([
  "platform_admin",
  "branch_admin",
  "support",
]);

const LIST_QUERY_KEYS = Object.freeze([
  "q",
  "page",
  "limit",
  "sort",
  "status",
  "branch_id",
]);

/**
 * @param {string} role
 */
export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string, permissions: string[] }} userContext
 * @param {string} actionKey
 * @param {object} [options]
 * @param {function} [options.legacyRoleCheck]
 */
export function assertPermission(
  userContext,
  actionKey,
  { legacyRoleCheck } = {},
) {
  if (anyPermissionMatches(userContext.permissions, actionKey)) {
    return;
  }

  const env = getRuntimeEnv();
  const mode = env.permissionMode || "dual";
  if (mode === "dual" && legacyRoleCheck?.(userContext)) {
    logger.warn(
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
export function assertAdminRole(userContext) {
  assertPermission(userContext, "profiles:create", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
  });
}

/**
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertPlatformAdmin(userContext) {
  assertPermission(userContext, "roles:assign", {
    legacyRoleCheck: (ctx) => ctx.role === "platform_admin",
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
export function resolveListScope(userContext, query = {}) {
  assertPermission(userContext, "profiles:list", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
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

  if (query.branch_id) {
    scope.branchId = query.branch_id;
  }

  return scope;
}

/**
 * Resolve read scope for GET lookup (?user_id=) before profile is loaded.
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} targetUserId
 * @returns {{ ouId: string, branchId?: string }}
 */
export function resolveLookupScope(userContext, targetUserId) {
  if (targetUserId === userContext.userId) {
    return {
      ouId: userContext.ouId,
      branchId: userContext.branchId,
    };
  }

  assertPermission(userContext, "profiles:lookup", {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
  });

  if (userContext.role === "platform_admin" || userContext.role === "support") {
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
 */
export function assertProfileScope(profile, userContext, actionKey) {
  if (profile.user_id === userContext.userId) {
    if (
      profile.ou_id !== userContext.ouId ||
      profile.branch_id !== userContext.branchId
    ) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Profile tenant does not match caller context",
      );
    }
    return;
  }

  assertPermission(userContext, actionKey, {
    legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
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
  if (userContext.role === "platform_admin" || userContext.role === "support") {
    return { ouId: userContext.ouId };
  }

  return {
    ouId: userContext.ouId,
    branchId: userContext.branchId,
  };
}

/**
 * @param {string} profileId
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export async function getProfileById(profileId, userContext) {
  const scope = resolveGetByIdScope(userContext);
  const found = await repository.findById(profileId, scope);

  if (!found) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertProfileScope(found.profile, userContext, "profiles:read");
  return found;
}

/**
 * @param {string} targetUserId
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export async function lookupProfileByUserId(targetUserId, userContext) {
  const scope = resolveLookupScope(userContext, targetUserId);
  const found = await repository.findByUserId(targetUserId, scope);

  if (!found) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertProfileScope(found.profile, userContext, "profiles:read");
  return found;
}

/**
 * @param {Record<string, unknown>} query
 */
function normalizeListQuery(query) {
  return {
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 20),
    status: query.status ?? "active",
    q: typeof query.q === "string" ? query.q : undefined,
    sort: typeof query.sort === "string" ? query.sort : "-upd_date",
    branch_id:
      typeof query.branch_id === "string" ? query.branch_id : undefined,
  };
}

/**
 * @param {Record<string, unknown>} query
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export async function listProfiles(query, userContext) {
  const normalized = normalizeListQuery(query);
  const scope = resolveListScope(userContext, {
    branch_id: normalized.branch_id,
  });

  try {
    return await repository.listProfiles(normalized, scope);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid sort")) {
      throw new HttpError(400, CODES.INVALID_PARAM, error.message);
    }
    throw error;
  }
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
export async function createProfile(body, userContext, routeTemplate) {
  assertAdminRole(userContext);

  if (body.user_id) {
    return createProfileLinked(body, userContext, routeTemplate);
  }

  return createProfileProvision(body, userContext, routeTemplate);
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
async function createProfileProvision(body, userContext, routeTemplate) {
  if (body.user_id !== undefined) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "user_id must not be sent when provisioning a new auth user",
    );
  }

  if (body.username === undefined || body.password === undefined) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "username and password are required when user_id is omitted",
    );
  }

  const username = normalizeUsername(String(body.username));
  const password = String(body.password);
  const fields = normalizeProfileFields(body);

  const tenantContext = {
    userId: userContext.userId,
    ouId: userContext.ouId,
    branchId: userContext.branchId,
  };

  // Optimistic duplicate-code check. A concurrent request could still
  // insert the same code between here and insertProfile; in that case
  // MongoDB's unique index on (ou_id, branch_id, code) will raise a
  // duplicate-key error (11000), which error-handler maps to 409.
  if (
    await repository.existsProfileByCode(
      tenantContext.ouId,
      tenantContext.branchId,
      fields.code,
    )
  ) {
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "A staff profile with this code already exists for this branch",
    );
  }

  // Insert profile FIRST (local DB, reliable) before calling auth service.
  // This eliminates orphan auth users: if provisionUser fails, we only
  // need to delete a local document — no HTTP round-trip to compensate.
  const created = await repository.insertProfile(
    fields,
    tenantContext,
    routeTemplate,
  );
  const profileId = created._raw._id.toString();
  const scope = { ouId: tenantContext.ouId, branchId: tenantContext.branchId };

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);

  let userId;
  try {
    const result = await authClient.provisionUser({
      username,
      password,
      role: body.role,
      ouId: tenantContext.ouId,
      branchId: tenantContext.branchId,
    });
    userId = result.userId;
  } catch (error) {
    // Provision failed — clean up the local profile. This is a local
    // MongoDB operation with writeConcern { w: "majority", j: true },
    // making it far more reliable than the HTTP-based compensation
    // in the previous design.
    logger.error(
      { err: error, profileId },
      "provisionUser failed, cleaning up profile",
    );
    await repository.deleteProfileById(profileId, scope).catch((delErr) => {
      logger.error(
        { err: delErr, profileId },
        "failed to delete profile after provisionUser failure",
      );
    });
    throw error;
  }

  // Link the newly provisioned auth user to the profile.
  const linked = await repository.linkProfileToUser(
    profileId,
    scope,
    userId,
    { userId: tenantContext.userId },
    routeTemplate,
  );
  if (!linked) {
    // Profile was modified concurrently or deleted — this should not
    // happen under normal operation since the profile was just created
    // with user_id: null and unique index prevents duplicates.
    logger.error(
      { profileId, userId },
      "linkProfileToUser failed — profile state unexpected, cleaning up profile",
    );
    await repository.deleteProfileById(profileId, scope).catch(() => {});
    await authClient.deactivateUser(userId).catch((deactivateErr) => {
      logger.error(
        { err: deactivateErr, orphanUserId: userId },
        "failed to deactivate orphan auth user after linkProfileToUser failure",
      );
    });
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "Profile state changed unexpectedly during provisioning. Retry.",
    );
  }

  try {
    await writeAuditEvent({
      eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
      userContext: tenantContext,
      routeTemplate,
      profileId: linked.profile.id,
      targetUserId: userId,
      payload: { code: fields.code },
    });
  } catch (auditErr) {
    logger.error(
      { err: auditErr },
      "audit write failed after profile create (provision)",
    );
  }

  return linked;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
async function createProfileLinked(body, userContext, routeTemplate) {
  if (body.username !== undefined || body.password !== undefined) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "username and password must not be sent when linking an existing user_id",
    );
  }

  const userId = String(body.user_id);
  const fields = normalizeProfileFields(body);

  const authUser = await repository.findAuthUserById(userId);
  if (!authUser) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested auth user was not found",
    );
  }

  assertAdminCanLinkUser(authUser, userContext);

  const tenantContext = tenantContextFromAuthUser(authUser, userContext.userId);

  if (
    await repository.existsProfileByCode(
      tenantContext.ouId,
      tenantContext.branchId,
      fields.code,
    )
  ) {
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "A staff profile with this code already exists for this branch",
    );
  }

  const created = await repository.insertProfile(
    { ...fields, user_id: userId },
    tenantContext,
    routeTemplate,
  );

  try {
    await writeAuditEvent({
      eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
      userContext: tenantContext,
      routeTemplate,
      profileId: created.profile.id,
      targetUserId: userId,
      payload: { code: fields.code },
    });
  } catch (auditErr) {
    logger.error(
      { err: auditErr },
      "audit write failed after profile create (link)",
    );
  }

  return created;
}

const FORBIDDEN_PATCH_KEYS = Object.freeze([
  "user_id",
  "ou_id",
  "branch_id",
  "status",
  "password",
]);

/**
 * @param {Record<string, unknown>} body
 */
export function assertPatchBodyAllowed(body) {
  for (const key of FORBIDDEN_PATCH_KEYS) {
    if (body[key] !== undefined) {
      throw new HttpError(
        400,
        CODES.INVALID_PARAM,
        `${key} cannot be updated via profile patch`,
      );
    }
  }
}

/**
 * @param {string} profileId
 * @param {Record<string, unknown>} body
 * @param {string | string[] | undefined} ifMatchHeader
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
export async function patchProfile(
  profileId,
  body,
  ifMatchHeader,
  userContext,
  routeTemplate,
) {
  assertPatchBodyAllowed(body);

  const ifMatchDate = parseIfMatchHeader(ifMatchHeader);

  const scope = resolveGetByIdScope(userContext);
  const existing = await repository.findById(profileId, scope);
  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertProfileScope(existing.profile, userContext, "profiles:edit");

  const patchBody = { ...body };
  const isOwnProfile = existing.profile.user_id === userContext.userId;
  if (isOwnProfile && patchBody.code !== undefined) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "code cannot be changed on own profile",
    );
  }

  const fields = normalizePatchFields(patchBody);
  if (Object.keys(fields).length === 0) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "At least one patchable profile field is required",
    );
  }

  if (
    fields.code &&
    fields.code !== existing.profile.code &&
    (await repository.existsProfileByCode(
      existing.profile.ou_id,
      existing.profile.branch_id,
      fields.code,
    ))
  ) {
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "A staff profile with this code already exists for this branch",
    );
  }

  const updated = await repository.updateProfile(
    profileId,
    scope,
    fields,
    userContext,
    routeTemplate,
    ifMatchDate,
  );

  if (!updated) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  if ("stale" in updated) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }

  try {
    const auditPayload = { ...fields };
    if (auditPayload.email !== undefined) auditPayload.email = "[REDACTED]";
    if (auditPayload.tel !== undefined) auditPayload.tel = "[REDACTED]";
    await writeAuditEvent({
      eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_UPDATE,
      userContext: {
        userId: userContext.userId,
        ouId: existing.profile.ou_id,
        branchId: existing.profile.branch_id,
      },
      routeTemplate,
      profileId: updated.profile.id,
      targetUserId: updated.profile.user_id,
      payload: auditPayload,
    });
  } catch (auditErr) {
    logger.error({ err: auditErr }, "audit write failed after profile patch");
  }

  return updated;
}

/**
 * @param {string | string[] | undefined} ifMatchHeader
 */
function parseIfMatchHeader(ifMatchHeader) {
  const ifMatchRaw = Array.isArray(ifMatchHeader)
    ? ifMatchHeader[0]
    : ifMatchHeader;
  if (!ifMatchRaw || !String(ifMatchRaw).trim()) {
    throw new HttpError(
      428,
      CODES.PRECONDITION_REQUIRED,
      "If-Match header is required for this operation.",
    );
  }

  const ifMatchDate = decodeIfMatch(String(ifMatchRaw));
  if (!ifMatchDate) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }

  return ifMatchDate;
}

/**
 * Admin lifecycle (archive/restore) — not own profile.
 * @param {{ user_id: string }} profile
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertAdminLifecycleAccess(profile, userContext, actionKey) {
  if (profile.user_id === userContext.userId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Cannot archive or restore your own profile",
    );
  }

  assertProfileScope(profile, userContext, actionKey);
}

/**
 * @param {{ profileId: string, ifMatchHeader: string | string[] | undefined, userContext: { userId: string, ouId: string, branchId: string, role: string }, routeTemplate: string, expectedStatus: 'active'|'archived', nextStatus: 'active'|'archived', eventType: string, invalidTransitionMessage: string }} params
 */
async function transitionProfileStatus({
  profileId,
  ifMatchHeader,
  userContext,
  routeTemplate,
  expectedStatus,
  nextStatus,
  eventType,
  invalidTransitionMessage,
}) {
  assertAdminRole(userContext);

  const ifMatchDate = parseIfMatchHeader(ifMatchHeader);
  const scope = resolveGetByIdScope(userContext);
  const existing = await repository.findById(profileId, scope);

  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertAdminLifecycleAccess(existing.profile, userContext, "profiles:edit");

  if (existing.profile.status !== expectedStatus) {
    throw new HttpError(400, CODES.INVALID_PARAM, invalidTransitionMessage);
  }

  const updated = await repository.updateProfileStatus(
    profileId,
    scope,
    expectedStatus,
    nextStatus,
    userContext,
    routeTemplate,
    ifMatchDate,
  );

  if (!updated) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  if ("invalidTransition" in updated) {
    throw new HttpError(400, CODES.INVALID_PARAM, invalidTransitionMessage);
  }

  if ("stale" in updated) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }

  try {
    await writeAuditEvent({
      eventType,
      userContext: {
        userId: userContext.userId,
        ouId: existing.profile.ou_id,
        branchId: existing.profile.branch_id,
      },
      routeTemplate,
      profileId: updated.profile.id,
      targetUserId: updated.profile.user_id,
      payload: { status: nextStatus },
    });
  } catch (auditErr) {
    logger.error(
      { err: auditErr },
      "audit write failed after profile status transition",
    );
  }

  return updated;
}

/**
 * @param {string} profileId
 * @param {string | string[] | undefined} ifMatchHeader
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 * @param {string} [requestId]
 */
export async function archiveProfile(
  profileId,
  ifMatchHeader,
  userContext,
  routeTemplate,
  requestId,
) {
  const result = await transitionProfileStatus({
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    expectedStatus: "active",
    nextStatus: "archived",
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_ARCHIVE,
    invalidTransitionMessage: "Profile is already archived",
  });

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);
  try {
    await authClient.revokeUserSessions({
      userId: result.profile.user_id,
      correlationId: requestId ?? routeTemplate,
      maxRetries: env.authRevokeMaxRetries,
      backoffMs: env.authRevokeBackoffMs,
    });
  } catch (error) {
    if (
      error instanceof HttpError &&
      error.code === CODES.STAFF_AUTH_REVOKE_PENDING
    ) {
      // Archive is already committed to DB. Revoke exhausted retries but
      // is handled asynchronously by the background reconciler. Increment
      // the metric for alerting and return the archived profile — do NOT
      // re-throw, as the operation succeeded from the caller's perspective.
      incrementAuthRevokePendingTotal();
      return result;
    }
    throw error;
  }

  return result;
}

/**
 * @param {string} profileId
 * @param {string | string[] | undefined} ifMatchHeader
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
export async function restoreProfile(
  profileId,
  ifMatchHeader,
  userContext,
  routeTemplate,
) {
  return transitionProfileStatus({
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    expectedStatus: "archived",
    nextStatus: "active",
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_RESTORE,
    invalidTransitionMessage: "Profile is not archived",
  });
}

/**
 * @param {string} profileId
 * @param {{ password: string, revoke_sessions?: boolean }} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 * @param {string} [requestId]
 */
export async function resetProfilePassword(
  profileId,
  body,
  userContext,
  routeTemplate,
  requestId,
) {
  const scope = resolveGetByIdScope(userContext);
  const existing = await repository.findById(profileId, scope);

  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertAdminLifecycleAccess(existing.profile, userContext, "profiles:edit");

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);
  await authClient.setUserPassword({
    userId: existing.profile.user_id,
    password: body.password,
    revokeSessions: body.revoke_sessions !== false,
    correlationId: requestId ?? routeTemplate,
  });
}

/**
 * Change the auth role of a staff member's linked user account.
 * Only platform_admin may perform this operation.
 * @param {string} profileId
 * @param {{ role: string }} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 * @param {string} [requestId]
 */
export async function changeProfileRole(
  profileId,
  body,
  userContext,
  routeTemplate,
  requestId,
) {
  assertPlatformAdmin(userContext);

  const scope = resolveGetByIdScope(userContext);
  const existing = await repository.findById(profileId, scope);

  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  if (!existing.profile.user_id) {
    throw new HttpError(
      409,
      CODES.INVALID_PARAM,
      "Profile is not linked to an auth user",
    );
  }

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);
  await authClient.setUserRole({
    userId: existing.profile.user_id,
    role: body.role,
    revokeSessions: true,
    correlationId: requestId ?? routeTemplate,
  });

  try {
    await writeAuditEvent({
      eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_UPDATE,
      userContext: {
        userId: userContext.userId,
        ouId: existing.profile.ou_id,
        branchId: existing.profile.branch_id,
      },
      routeTemplate,
      profileId: existing.profile.id,
      targetUserId: existing.profile.user_id,
      payload: { role: body.role },
    });
  } catch (auditErr) {
    logger.error(
      { err: auditErr },
      "audit write failed after profile role change",
    );
  }
}
