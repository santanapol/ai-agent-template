import { isValidObjectId } from "../../lib/object-id.js";
import { mapTransactionForApi } from "../../lib/invoice-serialize.js";
import { findAgentByOuAndBranchId } from "./agents.repository.js";
import { mapEnrichedInvoiceForApi } from "./invoice-enrich.js";
import * as invoiceRepo from "./invoice.repository.js";
import * as masterDataRepo from "./master-data.repository.js";
import * as transactionRepo from "./transaction.repository.js";

export const MAX_BATCH_IDS = 50;

/**
 * @param {string | undefined} idsParam
 * @returns {{ ok: true, ids: string[] } | { ok: false, code: "INVALID_PARAM" }}
 */
export function parseBatchIds(idsParam) {
  if (!idsParam || typeof idsParam !== "string" || idsParam.trim() === "") {
    return { ok: false, code: "INVALID_PARAM" };
  }

  const raw = idsParam
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (raw.length === 0 || raw.length > MAX_BATCH_IDS) {
    return { ok: false, code: "INVALID_PARAM" };
  }

  const ids = [...new Set(raw)];
  for (const id of ids) {
    if (!isValidObjectId(id)) {
      return { ok: false, code: "INVALID_PARAM" };
    }
  }

  return { ok: true, ids };
}

/**
 * @param {import('mongodb').Document} invoice
 * @param {import('mongodb').Document[]} txns
 * @param {typeof masterDataRepo} repoMasterData
 */
async function mapTransactionsForInvoice(invoice, txns, repoMasterData) {
  const recordOuId = String(invoice.ou_id);
  const [ouName, branchName] = await Promise.all([
    repoMasterData.findOrganizationNameByOuId(recordOuId),
    repoMasterData.findBranchDisplayName(String(invoice.branch_id)),
  ]);

  const companyIds = [...new Set(txns.map((row) => row.company_id))];
  const categoryIds = [...new Set(txns.map((row) => row.main_category_id))];

  const [companyNames, categoryNames] = await Promise.all([
    repoMasterData.findGameCompanyNamesByIds(companyIds),
    repoMasterData.findGameMainCategoryNamesByIds(categoryIds),
  ]);

  return txns.map((row) =>
    mapTransactionForApi(row, {
      ouName,
      branchName,
      companyName: companyNames.get(String(row.company_id)) ?? null,
      mainCategoryName: categoryNames.get(String(row.main_category_id)) ?? null,
    }),
  );
}

/**
 * @param {{
 *   idsParam?: string,
 *   includeTransactions?: boolean,
 *   ouId: string,
 *   scopeBranchId?: string,
 *   _repos?: object,
 * }} params
 */
export async function getInvoicesBatch({
  idsParam,
  includeTransactions = false,
  ouId,
  scopeBranchId,
  _repos,
}) {
  const parsed = parseBatchIds(idsParam);
  if (!parsed.ok) {
    return { success: false, code: parsed.code };
  }

  const repoInvoice = _repos?.invoice ?? invoiceRepo;
  const repoMasterData = _repos?.masterData ?? masterDataRepo;
  const repoTransaction = _repos?.transaction ?? transactionRepo;
  const repoFindAgent =
    _repos?.findAgentByOuAndBranchId ?? findAgentByOuAndBranchId;

  const invoices = await repoInvoice.findDetailByIds(
    parsed.ids,
    ouId,
    scopeBranchId,
  );
  const foundIdSet = new Set(invoices.map((invoice) => String(invoice._id)));
  const missing = parsed.ids.filter((id) => !foundIdSet.has(id));

  const enrichRepos = {
    masterData: repoMasterData,
    findAgentByOuAndBranchId: repoFindAgent,
  };

  /** @type {Record<string, import('mongodb').Document[]>} */
  const txnsByInvoiceId = {};
  if (includeTransactions && invoices.length > 0) {
    const allTxns = await repoTransaction.findByInvoiceIds(
      invoices.map((invoice) => String(invoice._id)),
    );
    for (const txn of allTxns) {
      const key = String(txn.ref_iv_id);
      if (!txnsByInvoiceId[key]) txnsByInvoiceId[key] = [];
      txnsByInvoiceId[key].push(txn);
    }
  }

  const items = [];
  for (const invoice of invoices) {
    const detail = await mapEnrichedInvoiceForApi(invoice, enrichRepos);
    if (includeTransactions) {
      const txns = txnsByInvoiceId[String(invoice._id)] ?? [];
      detail.transactions = await mapTransactionsForInvoice(
        invoice,
        txns,
        repoMasterData,
      );
    }
    items.push(detail);
  }

  return {
    success: true,
    code: "SUCCESS",
    data: { items, missing },
  };
}
