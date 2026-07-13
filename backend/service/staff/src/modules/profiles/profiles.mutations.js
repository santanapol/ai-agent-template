import { getRuntimeEnv } from "../../config/runtime-env.js";
import logger from "../../config/logger.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../lib/audit/audit-events.js";
import { writeAuditEvent } from "../../lib/audit/audit-writer.js";
import { getAuthInternalClient } from "../../lib/clients/auth-internal.client.js";
import { decodeIfMatch } from "../../lib/etag.js";
import {
  normalizePatchFields,
  normalizeProfileFields,
  normalizeUsername,
} from "../../lib/utils/normalize.js";
import * as repository from "./profiles.repository.js";
import {
  assertAdminRole,
  assertPlatformAdmin,
  assertAdminCanLinkUser,
  tenantContextFromAuthUser,
  resolveGetByIdScope,
  assertProfileScope,
} from "./profiles.access.js";

/**
 * @param {Record<string, unknown>} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
export async function createProfile(
  body,
  userContext,
  routeTemplate,
  { log } = {},
) {
  assertAdminRole(userContext, { log });

  if (body.user_id) {
    return createProfileLinked(body, userContext, routeTemplate);
  }

  return createProfileProvision(body, userContext, routeTemplate, { log });
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 * @param {string} routeTemplate
 */
async function createProfileProvision(
  body,
  userContext,
  routeTemplate,
  { log } = {},
) {
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
  const defaultRole = getRuntimeEnv().staffProvisionDefaultRole || "staff";
  const requestedRole = body.role ?? defaultRole;
  if (requestedRole !== defaultRole) {
    assertPlatformAdmin(userContext, { log });
  }

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
      role: requestedRole,
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
 * @param {string | string[] | undefined} ifMatchHeader
 */
export function parseIfMatchHeader(ifMatchHeader) {
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
  { log } = {},
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

  assertProfileScope(existing.profile, userContext, "profiles:edit", { log });

  const patchBody = { ...body };
  const isOwnProfile = existing.profile.user_id === userContext.userId;
  if (isOwnProfile && patchBody.code !== undefined) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "code cannot be changed on own profile",
    );
  }

  const { fields, unset } = normalizePatchFields(patchBody);
  if (Object.keys(fields).length === 0 && unset.length === 0) {
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
    unset,
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
