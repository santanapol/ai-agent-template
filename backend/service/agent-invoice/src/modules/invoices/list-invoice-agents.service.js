import * as branchRepo from "./branch.repository.js";

function mapBranchRow(row) {
  return {
    branch_id: String(row._id ?? row.branch_id),
    branch_name: row.branch_name ?? null,
    branch_code: row.branch_code ?? null,
    active: row.active !== false && row.active !== "0" && row.active !== 0,
  };
}

/**
 * @param {Array<{ branch_id: string, branch_name?: string | null, branch_code?: string | null }>} items
 * @param {string} ouId
 * @param {string[]} ensureBranchIds
 * @param {(branchId: string) => Promise<import('mongodb').Document | null>} findBranchById
 */
export async function mergeEnsuredInvoiceAgentBranches(
  items,
  ouId,
  ensureBranchIds,
  findBranchById,
) {
  const byId = new Map(items.map((item) => [item.branch_id, item]));

  for (const branchId of ensureBranchIds) {
    if (!branchId || byId.has(branchId)) continue;
    const row = await findBranchById(branchId);
    if (!row) continue;
    const rowOuId = row.ou_id?.toHexString?.() ?? String(row.ou_id);
    if (rowOuId !== String(ouId)) continue;
    byId.set(branchId, {
      branch_id: String(row._id),
      branch_name: row.branch_name ?? null,
      branch_code: row.branch_code ?? null,
    });
  }

  return [...byId.values()];
}

/**
 * @param {{ ouId: string, ensureBranchIds?: string[], restrictBranchId?: string }} params
 */
export async function listInvoiceAgents({
  ouId,
  ensureBranchIds = [],
  restrictBranchId,
}) {
  // Branch-pinned callers may only see their own branch (never the full OU list).
  if (restrictBranchId) {
    const row = await branchRepo.findBranchById(restrictBranchId);
    if (!row) {
      return { success: true, code: "SUCCESS", data: [] };
    }
    const rowOuId = row.ou_id?.toHexString?.() ?? String(row.ou_id);
    if (rowOuId !== String(ouId)) {
      return { success: true, code: "SUCCESS", data: [] };
    }
    return { success: true, code: "SUCCESS", data: [mapBranchRow(row)] };
  }

  const items = await branchRepo.findBranchesByOuId(ouId);
  const merged = await mergeEnsuredInvoiceAgentBranches(
    items,
    ouId,
    ensureBranchIds,
    branchRepo.findBranchById,
  );

  return {
    success: true,
    code: "SUCCESS",
    data: merged.map((item) => mapBranchRow(item)),
  };
}
