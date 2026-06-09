import { mapInvoiceListItemForApi } from "../../lib/invoice-serialize.js";

import {
  parseListInvoicesQuery,
  validateListInvoicesQuery,
} from "./list-invoices.query.js";

import * as invoiceRepo from "./invoice.repository.js";

import * as masterDataRepo from "./master-data.repository.js";

/**

 * @param {{ query?: Record<string, unknown>, ouId: string }} params

 */

export async function listInvoices({ query = {}, ouId }) {
  const parsed = parseListInvoicesQuery(query);

  const validation = validateListInvoicesQuery(parsed);

  if (!validation.ok) {
    return { success: false, code: validation.code };
  }

  const {
    page: pageNum,
    limit: limitNum,
    ivNo: ivNoFilter,
    branchId: branchIdFilter,
    billingMonth: billingMonthFilter,
    status: statusFilter,
  } = parsed;

  const filter = invoiceRepo.buildListFilter({
    ouId,

    ivNo: ivNoFilter,

    branchId: branchIdFilter,

    billingMonth: billingMonthFilter,

    status: statusFilter,
  });

  const skip = (pageNum - 1) * limitNum;

  const total = await invoiceRepo.countByFilter(filter);

  const fetchLimit = total === null ? limitNum + 1 : limitNum;

  let rows = await invoiceRepo.findManyByFilter({
    filter,
    skip,
    limit: fetchLimit,
  });

  let hasMore = false;

  if (total === null) {
    hasMore = rows.length > limitNum;

    if (hasMore) {
      rows = rows.slice(0, limitNum);
    }
  }

  const branchNameCache = new Map();

  const items = [];

  for (const row of rows) {
    const branchKey = String(row.branch_id);

    let branchName = branchNameCache.get(branchKey);

    if (branchName === undefined) {
      branchName = await masterDataRepo.findBranchDisplayName(branchKey);

      branchNameCache.set(branchKey, branchName);
    }

    items.push(mapInvoiceListItemForApi(row, { branchName }));
  }

  const totalPages =
    total === null ? null : total === 0 ? 0 : Math.ceil(total / limitNum);

  const pagination = {
    page: pageNum,

    limit: limitNum,

    total,

    totalPages,
  };

  if (total === null) {
    pagination.hasMore = hasMore;
  }

  return {
    success: true,

    code: "SUCCESS",

    data: {
      items,

      pagination,
    },
  };
}
