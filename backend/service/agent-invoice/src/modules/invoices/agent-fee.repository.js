import { Decimal128, ObjectId } from "mongodb";

import { getInvoiceDatabase } from "../../config/database-invoice.js";

import {
  findAgentByBranchId,
  resolveFeeBranchId,
} from "./agents.repository.js";

const COLLECTION = "agent_fees";

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseFeeRate(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (value instanceof Decimal128) {
    const n = Number(value.toString());
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (typeof value === "object" && value !== null && "toString" in value) {
    const n = Number(String(value));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * @param {{ ou_id: unknown, branch_id: unknown, company_id?: unknown, game_company_id?: unknown, main_category_id?: unknown, game_main_cate_id?: unknown }} parts
 */
export function agentFeeLookupKey(parts) {
  const companyId = parts.game_company_id ?? parts.company_id;
  const mainCate = parts.game_main_cate_id ?? parts.main_category_id;
  return `${String(parts.ou_id)}:${String(parts.branch_id)}:${String(companyId)}:${String(mainCate)}`;
}

/**
 * Resolve fee via `agents` → `agent_fees` → `default_fee_rate`.
 *
 * @param {{ invoiceBranchId: string, transactions: Array<{ ou_id: import('mongodb').ObjectId | string, branch_id?: import('mongodb').ObjectId | string, company_id: import('mongodb').ObjectId | string, main_category_id: import('mongodb').ObjectId | string }> }} params
 * @returns {Promise<(txn: { ou_id: unknown, company_id: unknown, main_category_id: unknown }) => number | null>}
 */
export async function buildRatioLookup({ invoiceBranchId, transactions }) {
  if (transactions.length === 0) {
    return () => null;
  }

  const agent = await findAgentByBranchId(invoiceBranchId);
  if (!agent) {
    return () => null;
  }

  const feeBranchId = resolveFeeBranchId(agent);
  if (!feeBranchId) {
    return () => null;
  }

  const defaultRate = parseFeeRate(agent.default_fee_rate);
  const ouId = String(transactions[0].ou_id);
  const companyIds = [
    ...new Set(transactions.map((txn) => String(txn.company_id))),
  ];

  const db = getInvoiceDatabase();
  const ouObjectId = new ObjectId(ouId);
  const feeBranchObjectId = new ObjectId(feeBranchId);

  const docs = await db
    .collection(COLLECTION)
    .find({
      ou_id: ouObjectId,
      branch_id: feeBranchObjectId,
      game_company_id: { $in: companyIds.map((id) => new ObjectId(id)) },
    })
    .toArray();

  /** @type {Map<string, number>} */
  const feeMap = new Map();
  for (const doc of docs) {
    const key = agentFeeLookupKey(doc);
    if (feeMap.has(key)) continue;
    const rate = parseFeeRate(doc.agent_fee);
    if (rate == null) continue;
    feeMap.set(key, rate);
  }

  return (txn) => {
    const key = agentFeeLookupKey({
      ou_id: txn.ou_id,
      branch_id: feeBranchId,
      company_id: txn.company_id,
      main_category_id: txn.main_category_id,
    });
    return feeMap.get(key) ?? defaultRate ?? null;
  };
}

/**
 * @param {{ invoiceBranchId: string, ouId: string, companyId: string, mainCategoryId: string }} params
 */
export async function findRatio({
  invoiceBranchId,
  ouId,
  companyId,
  mainCategoryId,
}) {
  const lookup = await buildRatioLookup({
    invoiceBranchId,
    transactions: [
      {
        ou_id: ouId,
        company_id: companyId,
        main_category_id: mainCategoryId,
      },
    ],
  });
  return lookup({
    ou_id: ouId,
    company_id: companyId,
    main_category_id: mainCategoryId,
  });
}
