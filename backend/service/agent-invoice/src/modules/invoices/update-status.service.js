import { isValidObjectId } from "../../lib/object-id.js";

import { mapInvoiceForApi } from "../../lib/invoice-serialize.js";

import { ROUTE_PROG } from "../../lib/route-prog.js";

import { decodeEtag } from "../../lib/etag.js";

import { findAgentByBranchId } from "./agents.repository.js";

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
  scopeBranchId,
  _repos,
}) {
  const repoInvoice = _repos?.invoice ?? invoiceRepo;

  const repoMasterData = _repos?.masterData ?? masterDataRepo;

  const repoFindAgent = _repos?.findAgentByBranchId ?? findAgentByBranchId;

  if (!isValidObjectId(id)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  if (status !== "PAID" && status !== "VOID") {
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

  const invoice = await repoInvoice.findById(id, ouId, scopeBranchId);

  if (!invoice) {
    return { success: false, code: "RESOURCE_NOT_FOUND" };
  }

  if (status === "PAID") {
    if (invoice.status !== "READY") {
      return { success: false, code: "INVALID_PARAM" };
    }
  } else if (status === "VOID") {
    const cancelableStatuses = new Set([
      "READY",
      "PENDING",
      "MISSING_FEE",
      "ERROR",
    ]);
    if (!cancelableStatuses.has(invoice.status)) {
      return { success: false, code: "INVALID_PARAM" };
    }
  }

  const { matchedCount } = await repoInvoice.updateStatus({
    id,

    ouId,

    status,

    actor,

    prog: PROG,

    expectedUpdDate,

    expectedStatus: invoice.status,
  });

  if (matchedCount === 0) {
    return { success: false, code: "VERSION_CONFLICT" };
  }

  const updated = await repoInvoice.findDetailById(id, ouId, scopeBranchId);

  const recordOuId = String(updated.ou_id);
  const branchId = String(updated.branch_id);

  const [branchName, ouName, agent] = await Promise.all([
    repoMasterData.findBranchDisplayName(branchId),

    repoMasterData.findOuDisplayName(recordOuId),

    repoFindAgent(branchId),
  ]);

  return {
    success: true,

    code: "SUCCESS",

    data: mapInvoiceForApi(updated, {
      branchName,
      ouName,
      currency: agent?.currency ?? null,
    }),
  };
}
