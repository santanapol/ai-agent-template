import { toObjectId } from "../../lib/utils/mongo.js";

/**
 * Tenant scope for reads/writes — always includes ou_id; branch when provided.
 * @param {{ ouId: string, branchId?: string }} scope
 */
export function buildScopeFilter(scope) {
  const filter = { ou_id: toObjectId(scope.ouId) };
  if (scope.branchId) {
    filter.branch_id = toObjectId(scope.branchId);
  }
  return filter;
}
