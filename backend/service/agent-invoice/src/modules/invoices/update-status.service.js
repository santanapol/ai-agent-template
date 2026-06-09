import { isValidObjectId } from "../../lib/object-id.js";

import { mapInvoiceForApi } from "../../lib/invoice-serialize.js";

import { ROUTE_PROG } from "../../lib/route-prog.js";

import { decodeEtag } from "../../lib/etag.js";

import * as invoiceRepo from "./invoice.repository.js";

import * as masterDataRepo from "./master-data.repository.js";

const PROG = ROUTE_PROG.INVOICES_STATUS;

/**

 * @param {{ id: string, status: string, actor: string, ouId: string, ifMatch?: string, _repos?: object }} params
 */

export async function updateInvoiceStatus({
  id,
  status,
  actor,
  ouId,
  ifMatch,
  _repos,
}) {
  const repoInvoice = _repos?.invoice ?? invoiceRepo;

  const repoMasterData = _repos?.masterData ?? masterDataRepo;

  if (!isValidObjectId(id)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  if (status !== "PAID") {
    return { success: false, code: "INVALID_PARAM" };
  }

  if (!ifMatch) {
    return { success: false, code: "PRECONDITION_REQUIRED" };
  }

  const expectedUpdDateISO = decodeEtag(ifMatch);

  if (!expectedUpdDateISO) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const expectedUpdDate = new Date(expectedUpdDateISO);

  if (isNaN(expectedUpdDate.getTime())) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const invoice = await repoInvoice.findById(id, ouId);

  if (!invoice) {
    return { success: false, code: "RESOURCE_NOT_FOUND" };
  }

  if (invoice.status !== "READY") {
    return { success: false, code: "INVALID_PARAM" };
  }

  const { matchedCount } = await repoInvoice.updateStatus({
    id,

    ouId,

    status: "PAID",

    actor,

    prog: PROG,

    expectedUpdDate,

    expectedStatus: "READY",
  });

  if (matchedCount === 0) {
    return { success: false, code: "VERSION_CONFLICT" };
  }

  const updated = await repoInvoice.findDetailById(id, ouId);

  const recordOuId = String(updated.ou_id);

  const [branchName, ouName] = await Promise.all([
    repoMasterData.findBranchDisplayName(String(updated.branch_id)),

    repoMasterData.findOuDisplayName(recordOuId),
  ]);

  return {
    success: true,

    code: "SUCCESS",

    data: mapInvoiceForApi(updated, { branchName, ouName }),
  };
}
