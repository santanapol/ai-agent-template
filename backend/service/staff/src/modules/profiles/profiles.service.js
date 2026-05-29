import { getRuntimeEnv } from "../../config/runtime-env.js";
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

export const ADMIN_ROLES = Object.freeze(["platform_admin", "branch_admin"]);

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
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export function assertAdminRole(userContext) {
  if (!isAdminRole(userContext.role)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Create profile requires platform_admin or branch_admin role",
    );
  }
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
  if (!isAdminRole(userContext.role)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "List access requires platform_admin or branch_admin role",
    );
  }

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

  if (!isAdminRole(userContext.role)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Lookup for another user requires admin role",
    );
  }

  if (userContext.role === "platform_admin") {
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
export function assertProfileScope(profile, userContext) {
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

  if (userContext.role === "platform_admin") {
    if (profile.ou_id !== userContext.ouId) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Profile is outside caller organizational unit",
      );
    }
    return;
  }

  if (userContext.role === "branch_admin") {
    if (
      profile.ou_id !== userContext.ouId ||
      profile.branch_id !== userContext.branchId
    ) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Profile is outside caller branch scope",
      );
    }
    return;
  }

  throw new HttpError(
    403,
    CODES.INVALID_USER_CONTEXT,
    "Insufficient role to access this profile",
  );
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
  if (userContext.role === "platform_admin") {
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

  assertProfileScope(found.profile, userContext);
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

  assertProfileScope(found.profile, userContext);
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

  // Optimistic duplicate-code check before provisioning. A concurrent
  // request could still insert the same code between here and insertProfile;
  // in that case MongoDB's unique index on (ou_id, branch_id, code) will
  // raise a duplicate-key error (11000), which error-handler maps to 409.
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

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);
  const { userId } = await authClient.provisionUser({
    username,
    password,
    ouId: tenantContext.ouId,
    branchId: tenantContext.branchId,
  });

  // Defensive guard: provisionUser returns a fresh userId, so a duplicate
  // here would indicate a bug in the auth service. Still checked to ensure
  // the invariant "one staff profile per user" is enforced at this layer.
  if (await repository.existsProfileByUserId(userId)) {
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "A staff profile already exists for this user",
    );
  }

  const created = await repository.insertProfile(
    { ...fields, user_id: userId },
    tenantContext,
    routeTemplate,
  );

  await writeAuditEvent({
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
    userContext: {
      userId: userContext.userId,
      ouId: tenantContext.ouId,
      branchId: tenantContext.branchId,
    },
    routeTemplate,
    profileId: created.profile.id,
    targetUserId: userId,
    payload: { code: fields.code },
  });

  return created;
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

  if (await repository.existsProfileByUserId(userId)) {
    throw new HttpError(
      409,
      CODES.DUPLICATE,
      "A staff profile already exists for this user",
    );
  }

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

  const auditContext = {
    userId: userContext.userId,
    ouId: tenantContext.ouId,
    branchId: tenantContext.branchId,
  };

  await writeAuditEvent({
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
    userContext: auditContext,
    routeTemplate,
    profileId: created.profile.id,
    targetUserId: userId,
    payload: { code: fields.code },
  });

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

  assertProfileScope(existing.profile, userContext);

  const patchBody = { ...body };
  const isOwnProfile = existing.profile.user_id === userContext.userId;
  if (isOwnProfile && patchBody.code !== undefined) {
    delete patchBody.code;
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
    payload: fields,
  });

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
export function assertAdminLifecycleAccess(profile, userContext) {
  assertAdminRole(userContext);

  if (profile.user_id === userContext.userId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Cannot archive or restore your own profile",
    );
  }

  assertProfileScope(profile, userContext);
}

/**
 * @param {string} profileId
 * @param {string | string[] | undefined} ifMatchHeader
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 * @param {'active'|'archived'} expectedStatus
 * @param {'active'|'archived'} nextStatus
 * @param {string} eventType
 * @param {string} invalidTransitionMessage
 */
async function transitionProfileStatus(
  profileId,
  ifMatchHeader,
  userContext,
  routeTemplate,
  expectedStatus,
  nextStatus,
  eventType,
  invalidTransitionMessage,
) {
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

  assertAdminLifecycleAccess(existing.profile, userContext);

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
  const result = await transitionProfileStatus(
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    "active",
    "archived",
    STAFF_AUDIT_EVENT_TYPES.PROFILE_ARCHIVE,
    "Profile is already archived",
  );

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
  return transitionProfileStatus(
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    "archived",
    "active",
    STAFF_AUDIT_EVENT_TYPES.PROFILE_RESTORE,
    "Profile is not archived",
  );
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

  assertAdminLifecycleAccess(existing.profile, userContext);

  const env = getRuntimeEnv();
  const authClient = getAuthInternalClient(env);
  await authClient.setUserPassword({
    userId: existing.profile.user_id,
    password: body.password,
    revokeSessions: body.revoke_sessions !== false,
    correlationId: requestId ?? routeTemplate,
  });
}
