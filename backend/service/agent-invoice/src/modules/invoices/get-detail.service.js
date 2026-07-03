import { buildEtag } from "../../lib/etag.js";

import { isValidObjectId } from "../../lib/object-id.js";

import { mapInvoiceForApi } from "../../lib/invoice-serialize.js";

import * as invoiceRepo from "./invoice.repository.js";

import * as masterDataRepo from "./master-data.repository.js";

/**

 * @param {{ id: string, ouId: string }} params

 * @returns {Promise<{ success: boolean, code: string, data?: object, etag?: string }>}

 */

export async function getInvoiceDetail({ id, ouId, scopeBranchId }) {
  if (!isValidObjectId(id)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const invoice = await invoiceRepo.findDetailById(id, ouId, scopeBranchId);

  if (!invoice) {
    return { success: false, code: "RESOURCE_NOT_FOUND" };
  }

  const recordOuId = String(invoice.ou_id);

  const [branchName, ouName] = await Promise.all([
    masterDataRepo.findBranchDisplayName(String(invoice.branch_id)),

    masterDataRepo.findOuDisplayName(recordOuId),
  ]);

  return {
    success: true,

    code: "SUCCESS",

    data: mapInvoiceForApi(invoice, { branchName, ouName }),

    etag: buildEtag(invoice.upd_date),
  };
}
