import { isCalLockStale, calStaleMs } from "../../lib/cal-stale.js";

import { buildEtag, validateIfMatch } from "../../lib/etag.js";

import { INTERNAL_ERROR_MESSAGE } from "../../lib/response.js";

import { ROUTE_PROG } from "../../lib/route-prog.js";

import * as invoiceRepo from "./invoice.repository.js";

import * as agentFeeRepo from "./agent-fee.repository.js";

import * as transactionRepo from "./transaction.repository.js";

const PROG = ROUTE_PROG.INVOICES_CALCULATE_FEE;

const VALID_ACTIONS = new Set(["CALCULATE", "MISSING_FEE"]);

/**

 * @param {{ ivId: string, action: string, ifMatch?: string, actor: string, ouId?: string }} params

 * @returns {Promise<{ success: boolean, code: string, message?: string, data?: object, etag?: string }>}

 */

export async function calculateFee({
  ivId,
  action,
  ifMatch,
  actor,
  ouId,
  scopeBranchId,
  log,
}) {
  if (!ifMatch) {
    return { success: false, code: "PRECONDITION_REQUIRED" };
  }

  if (!VALID_ACTIONS.has(action)) {
    return { success: false, code: "INVALID_PARAM" };
  }

  let locked = false;

  let previousStatus = null;

  try {
    let invoice = await invoiceRepo.findById(ivId, ouId, scopeBranchId);

    if (!invoice) {
      return { success: false, code: "RESOURCE_NOT_FOUND" };
    }

    if (invoice.status === "CAL") {
      if (isCalLockStale(invoice.upd_date)) {
        const staleBefore = new Date(Date.now() - calStaleMs());

        await invoiceRepo.resetStaleCalLock({
          id: ivId,

          actor,

          prog: PROG,

          staleBefore,
        });

        invoice = await invoiceRepo.findById(ivId, ouId, scopeBranchId);

        if (!invoice) {
          return { success: false, code: "RESOURCE_NOT_FOUND" };
        }
      } else {
        return {
          success: true,

          code: "SUCCESS",

          data: { invoice_status: "CAL", detail: "Calculate Processing" },
        };
      }
    }

    if (!validateIfMatch(ifMatch, invoice.upd_date)) {
      return { success: false, code: "VERSION_CONFLICT" };
    }

    previousStatus = invoice.status;

    locked = await invoiceRepo.tryLockForCalculate({
      id: ivId,

      expectedUpdDate: invoice.upd_date,

      actor,

      prog: PROG,
    });

    if (!locked) {
      return { success: false, code: "VERSION_CONFLICT" };
    }

    const transactions = await transactionRepo.findByInvoiceId({
      refIvId: ivId,

      missingFeeOnly: action === "MISSING_FEE",
    });

    const resolveRatio = await agentFeeRepo.buildRatioLookup({
      invoiceBranchId: String(invoice.branch_id),
      transactions,
    });

    let calStatus = null;

    for (const txn of transactions) {
      const ratio = resolveRatio(txn);

      if (ratio !== null) {
        const amount = txn.net_win * -1 * (ratio / 100);

        await transactionRepo.updateFeeAndAmount({
          id: txn._id,

          fee: ratio,

          amount,

          actor,

          prog: PROG,
        });
      } else {
        calStatus = "MISSING_FEE";

        await transactionRepo.updateFeeAndAmount({
          id: txn._id,

          fee: "N/A",

          amount: null,

          actor,

          prog: PROG,
        });
      }
    }

    const finalizedAt = new Date();

    if (calStatus === "MISSING_FEE") {
      await invoiceRepo.updateStatus({
        id: ivId,

        ouId,

        status: "MISSING_FEE",

        actor,

        prog: PROG,

        updDate: finalizedAt,
      });

      return {
        success: true,

        code: "SUCCESS",

        data: { invoice_status: "MISSING_FEE" },

        etag: buildEtag(finalizedAt),
      };
    }

    const sums = await transactionRepo.sumByInvoiceId(ivId);

    await invoiceRepo.finalizeInvoice({
      id: ivId,

      status: "READY",

      netWin: sums.net_win,

      bet: sums.bet,

      amount: sums.amount,

      actor,

      prog: PROG,

      updDate: finalizedAt,
    });

    return {
      success: true,

      code: "SUCCESS",

      data: {
        invoice_status: "READY",

        net_win: sums.net_win,

        bet: sums.bet,

        amount: sums.amount,
      },

      etag: buildEtag(finalizedAt),
    };
  } catch (err) {
    log?.error(
      { errCode: err?.code, errName: err?.name, ivId },
      "calculateFee: unhandled error during fee calculation",
    );

    if (locked && previousStatus) {
      await invoiceRepo

        .updateStatus({
          id: ivId,

          ouId,

          status: previousStatus,

          actor,

          prog: PROG,
        })

        .catch(() => {});
    }

    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}
