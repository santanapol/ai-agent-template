import { mapInvoiceForApi } from "../../lib/invoice-serialize.js";

/**
 * Resolve display names and agent currency for invoice detail responses.
 *
 * @param {import('mongodb').Document} invoice
 * @param {{
 *   masterData: {
 *     findBranchDisplayName: (branchId: string) => Promise<string | null>,
 *     findOuDisplayName: (ouId: string) => Promise<string | null>,
 *   },
 *   findAgentByOuAndBranchId: (
 *     ouId: string,
 *     branchId: string,
 *   ) => Promise<import('mongodb').Document | null>,
 * }} repos
 */
export async function enrichInvoiceDetail(invoice, repos) {
  const recordOuId = String(invoice.ou_id);
  const branchId = String(invoice.branch_id);

  const [branchName, ouName, agent] = await Promise.all([
    repos.masterData.findBranchDisplayName(branchId),
    repos.masterData.findOuDisplayName(recordOuId),
    repos.findAgentByOuAndBranchId(recordOuId, branchId),
  ]);

  return {
    branchName,
    ouName,
    currency: agent?.currency ?? null,
  };
}

/**
 * @param {import('mongodb').Document} invoice
 * @param {Parameters<typeof enrichInvoiceDetail>[1]} repos
 */
export async function mapEnrichedInvoiceForApi(invoice, repos) {
  const enrich = await enrichInvoiceDetail(invoice, repos);
  return mapInvoiceForApi(invoice, enrich);
}
