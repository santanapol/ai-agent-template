import { ObjectId } from "mongodb";

import { buildCreateAudit } from "../../lib/audit.js";
import { buildEtag } from "../../lib/etag.js";
import {
  billingDataPeriodFromReferenceMonth,
  billingYearMonthFromMonth,
  dueDateFromReferenceMonth,
  isValidBillingMonth,
} from "../../lib/date-range.js";
import { ROUTE_PROG } from "../../lib/route-prog.js";
import { nextIvNo } from "../../lib/iv-no-generator.js";

import * as betSummaryRepo from "./bet-summary.repository.js";
import * as branchRepo from "./branch.repository.js";
import { calculateFee } from "./calculate-fee.service.js";
import * as invoiceRepo from "./invoice.repository.js";
import * as transactionRepo from "./transaction.repository.js";

const PROG = ROUTE_PROG.INVOICES_GENERATE;

async function generateIvNo(branchId, yyyymm) {
  const branch = await branchRepo.findBranchById(branchId);
  if (!branch) {
    return { ok: false, code: "RESOURCE_NOT_FOUND" };
  }

  const latest = await invoiceRepo.findLatestByBranchId(branchId);
  return {
    ok: true,
    ivNo: nextIvNo({
      branchCode: branch.branch_code,
      yyyymm,
      latestIvNo: latest?.iv_no ?? null,
    }),
  };
}

function sameBranchId(a, b) {
  return String(a) === String(b);
}

/** @param {unknown} timezone */
function billingTimezoneForGroup(timezone) {
  if (timezone == null || timezone === "") {
    return "UTC";
  }
  return String(timezone);
}

/**
 * @param {{ month: string, branchId?: string }} params
 */
async function resolveGroups({ month, branchId, ouId }) {
  if (branchId) {
    return branchRepo.groupBranches({ branchId, branchIdsWithPlay: [], ouId });
  }

  const timezoneGroups = await branchRepo.distinctTimezoneGroups(ouId);
  const groups = [];

  for (const row of timezoneGroups) {
    const { startDate, endDate } = billingDataPeriodFromReferenceMonth(
      month,
      billingTimezoneForGroup(row.timezone),
    );
    const playBranchIds = await betSummaryRepo.distinctBranchIdsWithPlay(
      startDate,
      endDate,
    );
    const groupRows = await branchRepo.groupBranches({
      branchId: null,
      branchIdsWithPlay: playBranchIds.map((id) => String(id)),
      timezone: row.timezone,
      ouId,
    });
    groups.push(...groupRows);
  }

  return groups;
}

/**
 * @param {{ month: string, branchId?: string, actor: string, ouId: string }} params
 * @returns {Promise<{ success: boolean, code?: string, message?: string, data?: object }>}
 */
export async function generateInvoices({ month, branchId, actor, ouId }) {
  if (!isValidBillingMonth(month)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  const errorInvoiceIds = [];
  const ivArrayId = [];
  let generatedCount = 0;

  if (branchId) {
    const branch = await branchRepo.findBranchById(branchId);
    if (!branch || String(branch.ou_id) !== String(ouId)) {
      return {
        success: false,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found",
      };
    }
  }

  const groups = await resolveGroups({ month, branchId, ouId });
  const yyyymm = billingYearMonthFromMonth(month);
  const processedBranchIds = branchId ? null : new Set();

  for (const group of groups) {
    const { startDate, endDate } = billingDataPeriodFromReferenceMonth(
      month,
      billingTimezoneForGroup(group.timezone),
    );
    const branchIds = group.branch_id.map((id) => String(id));

    const aggregated = await betSummaryRepo.aggregateNetWin({
      branchIds,
      startDate,
      endDate,
    });

    for (const branchObjectId of group.branch_id) {
      const currentBranchId = String(branchObjectId);
      if (processedBranchIds?.has(currentBranchId)) {
        continue;
      }
      if (processedBranchIds) {
        processedBranchIds.add(currentBranchId);
      }

      const branchTxns = aggregated.filter((row) =>
        sameBranchId(row.branch_id, currentBranchId),
      );

      const ivNoResult = await generateIvNo(currentBranchId, yyyymm);
      if (!ivNoResult.ok) {
        return {
          success: false,
          code: ivNoResult.code,
          message: "The requested resource was not found",
        };
      }

      const audit = buildCreateAudit(actor, PROG);
      const baseFields = {
        billing_month: month,
        due_date: dueDateFromReferenceMonth(month),
      };

      if (branchTxns.length > 0) {
        const invoiceDoc = {
          ou_id: new ObjectId(group.ou_id),
          branch_id: new ObjectId(currentBranchId),
          iv_no: ivNoResult.ivNo,
          net_win: null,
          amount: null,
          status: "PENDING",
          ...baseFields,
          ...audit,
        };

        const { insertedId } = await invoiceRepo.insertOne(invoiceDoc);
        generatedCount += 1;

        const txnDocs = branchTxns.map((row) => ({
          ref_iv_id: insertedId,
          ou_id: row.ou_id,
          branch_id: row.branch_id,
          company_id: row.company_id,
          main_category_id: row.main_category_id,
          net_win: row.net_win,
          fee: null,
          amount: null,
          ...audit,
        }));

        try {
          await transactionRepo.insertMany(txnDocs);
          ivArrayId.push({
            iv_id: String(insertedId),
            upd_date: audit.upd_date,
          });
        } catch (err) {
          await invoiceRepo.deleteOne({ id: insertedId });
          generatedCount -= 1;
          throw err;
        }
      } else {
        await invoiceRepo.insertOne({
          ou_id: new ObjectId(group.ou_id),
          branch_id: new ObjectId(currentBranchId),
          iv_no: ivNoResult.ivNo,
          net_win: 0,
          amount: 0,
          status: "VOID",
          ...baseFields,
          ...audit,
        });
        generatedCount += 1;
      }
    }
  }

  for (const item of ivArrayId) {
    const result = await calculateFee({
      ivId: item.iv_id,
      action: "CALCULATE",
      ifMatch: buildEtag(item.upd_date),
      actor,
      ouId,
    });

    if (!result.success) {
      await invoiceRepo.markError({
        id: item.iv_id,
        actor,
        prog: PROG,
      });
      errorInvoiceIds.push(item.iv_id);
    }
  }

  if (errorInvoiceIds.length > 0) {
    return {
      success: false,
      code: "PARTIAL_FAILURE",
      message: "One or more invoices failed fee calculation",
      data: {
        error_invoice_ids: errorInvoiceIds,
        generated_count: generatedCount,
      },
    };
  }

  return {
    success: true,
    code: "SUCCESS",
    message: "Operation successful",
    data: { generated_count: generatedCount },
  };
}
