import { getRuntimeEnv } from "../../config/runtime-env.js";
import logger from "../../config/logger.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../lib/audit/audit-events.js";
import { writeAuditEvent } from "../../lib/audit/audit-writer.js";
import { getAuthInternalClient } from "../../lib/clients/auth-internal.client.js";
import { incrementAuthRevokePendingTotal } from "../../lib/utils/metrics.js";
import * as repository from "./profiles.repository.js";
import {
  resolveGetByIdScope,
  assertAdminLifecycleAccess,
  assertPlatformAdmin,
} from "./profiles.access.js";
import { parseIfMatchHeader } from "./profiles.mutations.js";

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
  actionKey,
  log,
}) {
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

  assertAdminLifecycleAccess(existing.profile, userContext, actionKey, { log });

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
  { log } = {},
) {
  const result = await transitionProfileStatus({
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    expectedStatus: "active",
    nextStatus: "archived",
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_ARCHIVE,
    invalidTransitionMessage: "Only active profiles can be archived",
    actionKey: "profiles:edit",
    log,
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
  { log } = {},
) {
  return transitionProfileStatus({
    profileId,
    ifMatchHeader,
    userContext,
    routeTemplate,
    expectedStatus: "archived",
    nextStatus: "active",
    eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_RESTORE,
    invalidTransitionMessage: "Profile is already active",
    actionKey: "profiles:edit",
    log,
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
  { log } = {},
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

  assertAdminLifecycleAccess(existing.profile, userContext, "profiles:edit", {
    log,
  });

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
 * Requires `roles:assign` (or platform_admin legacy fallback in dual mode).
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
  { log } = {},
) {
  assertPlatformAdmin(userContext, { log });

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
