import { buildEtag } from "../../lib/etag.js";
import { isValidObjectId } from "../../lib/object-id.js";
import { mapInvoiceForApi } from "../../lib/invoice-serialize.js";
import { findAgentByBranchId } from "./agents.repository.js";
import * as invoiceRepo from "./invoice.repository.js";
import * as masterDataRepo from "./master-data.repository.js";

/**
 * @param {{ id: string, ouId: string, scopeBranchId?: string, _repos?: object }} params
 * @returns {Promise<{ success: boolean, code: string, data?: object, etag?: string }>}
 */
export async function getInvoiceDetail({ id, ouId, scopeBranchId, _repos }) {
  const repoInvoice = _repos?.invoice ?? invoiceRepo;
  const repoMasterData = _repos?.masterData ?? masterDataRepo;
  const repoFindAgent = _repos?.findAgentByBranchId ?? findAgentByBranchId;

  if (!isValidObjectId(id)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const invoice = await repoInvoice.findDetailById(id, ouId, scopeBranchId);

  if (!invoice) {
    return { success: false, code: "RESOURCE_NOT_FOUND" };
  }

  const recordOuId = String(invoice.ou_id);
  const branchId = String(invoice.branch_id);

  const [branchName, ouName, agent] = await Promise.all([
    repoMasterData.findBranchDisplayName(branchId),
    repoMasterData.findOuDisplayName(recordOuId),
    repoFindAgent(branchId),
  ]);

  return {
    success: true,
    code: "SUCCESS",
    data: mapInvoiceForApi(invoice, {
      branchName,
      ouName,
      currency: agent?.currency ?? null,
    }),
    etag: buildEtag(invoice.upd_date),
  };
}
