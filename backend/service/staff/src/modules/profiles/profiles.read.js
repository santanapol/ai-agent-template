import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import * as repository from "./profiles.repository.js";
import {
  resolveListScope,
  resolveLookupScope,
  resolveGetByIdScope,
  assertProfileScope,
} from "./profiles.access.js";

/**
 * @param {string} profileId
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export async function getProfileById(profileId, userContext, { log } = {}) {
  const scope = resolveGetByIdScope(userContext);
  const found = await repository.findById(profileId, scope);

  if (!found) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertProfileScope(found.profile, userContext, "profiles:read", { log });
  return found;
}

/**
 * @param {string} targetUserId
 * @param {{ userId: string, ouId: string, branchId: string, role: string }} userContext
 */
export async function lookupProfileByUserId(
  targetUserId,
  userContext,
  { log } = {},
) {
  const scope = resolveLookupScope(userContext, targetUserId, { log });
  const found = await repository.findByUserId(targetUserId, scope);

  if (!found) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  assertProfileScope(found.profile, userContext, "profiles:read", { log });
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
export async function listProfiles(query, userContext, { log } = {}) {
  const normalized = normalizeListQuery(query);
  const scope = resolveListScope(
    userContext,
    {
      branch_id: normalized.branch_id,
    },
    { log },
  );

  try {
    return await repository.listProfiles(normalized, scope);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid sort")) {
      throw new HttpError(400, CODES.INVALID_PARAM, error.message);
    }
    throw error;
  }
}
