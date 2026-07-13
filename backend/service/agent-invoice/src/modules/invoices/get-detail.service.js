import { buildEtag } from "../../lib/etag.js";
import { isValidObjectId } from "../../lib/object-id.js";
import { findAgentByOuAndBranchId } from "./agents.repository.js";
import { mapEnrichedInvoiceForApi } from "./invoice-enrich.js";
import * as invoiceRepo from "./invoice.repository.js";
import * as masterDataRepo from "./master-data.repository.js";

/**
 * @param {{ id: string, ouId: string, scopeBranchId?: string, _repos?: object }} params
 * @returns {Promise<{ success: boolean, code: string, data?: object, etag?: string }>}
 */
export async function getInvoiceDetail({ id, ouId, scopeBranchId, _repos }) {
  const repoInvoice = _repos?.invoice ?? invoiceRepo;
  const repoMasterData = _repos?.masterData ?? masterDataRepo;
  const repoFindAgent =
    _repos?.findAgentByOuAndBranchId ?? findAgentByOuAndBranchId;

  if (!isValidObjectId(id)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const invoice = await repoInvoice.findDetailById(id, ouId, scopeBranchId);

  if (!invoice) {
    return { success: false, code: "RESOURCE_NOT_FOUND" };
  }

  return {
    success: true,
    code: "SUCCESS",
    data: await mapEnrichedInvoiceForApi(invoice, {
      masterData: repoMasterData,
      findAgentByOuAndBranchId: repoFindAgent,
    }),
    etag: buildEtag(invoice.upd_date),
  };
}
