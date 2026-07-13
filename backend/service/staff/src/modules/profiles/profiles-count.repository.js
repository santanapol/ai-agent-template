import { getDatabase } from "../../config/database.js";
import { STAFF_COLLECTIONS } from "../../config/mongo-collections.js";
import { buildScopeFilter } from "./profiles-scope.js";

function profilesCollection() {
  return getDatabase().collection(STAFF_COLLECTIONS.STAFF_PROFILES);
}

/**
 * @param {'active'|'archived'|'all'} status
 */
function buildStatusFilter(status) {
  if (status === "all") {
    return {};
  }
  return { status };
}

function listIndexHint(scope, status) {
  if (!scope.branchId && status === "archived") {
    return "list_archived_by_ou";
  }
  if (scope.branchId) {
    return "list_by_branch_status";
  }
  return undefined;
}

/**
 * @param {{ status: 'active'|'archived' }} query
 * @param {{ ouId: string, branchId?: string }} scope
 */
export async function countProfiles(query, scope) {
  const match = {
    ...buildScopeFilter(scope),
    ...buildStatusFilter(query.status),
  };
  const hint = listIndexHint(scope, query.status);
  const options = hint ? { hint } : {};
  return profilesCollection().countDocuments(match, options);
}
