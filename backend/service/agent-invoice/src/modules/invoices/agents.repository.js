import { ObjectId } from "mongodb";

import { getInvoiceDatabase } from "../../config/database-invoice.js";

const COLLECTION = "agents";

/**
 * @param {{ branch_id: unknown, ref_fee_branch_id?: unknown | null }} agentDoc
 * @returns {string | null}
 */
export function resolveFeeBranchId(agentDoc) {
  if (!agentDoc) return null;
  const ref = agentDoc.ref_fee_branch_id;
  if (ref !== null && ref !== undefined) return String(ref);
  if (agentDoc.branch_id === null || agentDoc.branch_id === undefined) return null;
  return String(agentDoc.branch_id);
}

/**
 * Lookup by invoice branch only — does not filter `ou_id`.
 *
 * @param {import('mongodb').ObjectId | string} branchId
 * @returns {Promise<import('mongodb').Document | null>}
 */
export async function findAgentByBranchId(branchId) {
  const db = getInvoiceDatabase();
  return db.collection(COLLECTION).findOne({
    branch_id: new ObjectId(String(branchId)),
  });
}
