import { canSwitchActiveBranchRole } from "@zero-platform/roles";

import { toDatastoreHttpError } from "../../lib/mongo-errors.js";
import {
  httpStatusForCode,
  sendError,
  sendSuccess,
  INTERNAL_ERROR_MESSAGE,
} from "../../lib/response.js";
import { resolveRequestId } from "../../lib/request-id.js";

import { calculateFee } from "./calculate-fee.service.js";
import { generateInvoices } from "./generate.service.js";
import { getInvoicesBatch } from "./batch-get.service.js";
import { getInvoiceDetail } from "./get-detail.service.js";
import { listInvoiceAgents } from "./list-invoice-agents.service.js";
import { resolveListInvoicesRequestQuery } from "./list-invoices.query.js";
import { listInvoices } from "./list-invoices.service.js";
import { listInvoiceTransactions } from "./list-transactions.service.js";
import { updateInvoiceStatus } from "./update-status.service.js";

/**
 * @param {{ success: boolean, code: string, message?: string, data?: object, etag?: string }} result
 * @param {import('fastify').FastifyReply} reply
 * @param {string | undefined} requestId
 */
/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {unknown} err
 * @param {string} logMessage
 */
function sendCaughtError(request, reply, err, logMessage) {
  const requestId = resolveRequestId(request.headers["x-request-id"]);
  request.log.error({ err, requestId }, logMessage);
  const mapped = toDatastoreHttpError(err);
  return sendError(reply, {
    statusCode: mapped?.statusCode ?? 500,
    code: mapped?.code ?? "INTERNAL_ERROR",
    message: mapped?.message ?? INTERNAL_ERROR_MESSAGE,
    requestId,
  });
}

/**
 * @param {{ branchId?: string, role?: string }} userContext
 * @returns {string | undefined}
 */
function resolveScopeBranchId(userContext) {
  const { branchId: activeBranchId, role } = userContext;
  return canSwitchActiveBranchRole(role) ? undefined : activeBranchId;
}

function sendServiceResult(reply, result, requestId) {
  if (!result.success) {
    const statusCode = httpStatusForCode(result.code);
    const message =
      result.message ??
      (result.code === "RESOURCE_NOT_FOUND"
        ? "The requested resource was not found"
        : result.code === "INVALID_PARAM"
          ? "Request validation failed"
          : result.code === "PRECONDITION_REQUIRED"
            ? "If-Match header is required"
            : result.code === "VERSION_CONFLICT"
              ? "Resource version conflict"
              : INTERNAL_ERROR_MESSAGE);

    return sendError(reply, {
      statusCode,
      code: result.code,
      message,
      requestId,
      data: result.data ?? null,
    });
  }

  if (result.etag) {
    reply.header("ETag", result.etag);
  }

  return sendSuccess(reply, {
    message: "Operation successful",
    data: result.data ?? null,
  });
}

export async function postGenerate(request, reply) {
  const {
    id: actor,
    ouId,
    branchId: activeBranchId,
    role,
  } = request.userContext;
  const { month, branch_id: bodyBranchId } = request.body ?? {};
  const branchId = canSwitchActiveBranchRole(role)
    ? bodyBranchId
    : activeBranchId;
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await generateInvoices({ month, branchId, actor, ouId });

    if (!result.success) {
      const statusCode = httpStatusForCode(result.code ?? "INTERNAL_ERROR");
      const message =
        result.message ??
        (result.code === "RESOURCE_NOT_FOUND"
          ? "The requested resource was not found"
          : result.code === "PARTIAL_FAILURE"
            ? "One or more invoices failed fee calculation"
            : INTERNAL_ERROR_MESSAGE);

      return sendError(reply, {
        statusCode,
        code: result.code ?? "INTERNAL_ERROR",
        message,
        requestId,
        data: result.data ?? null,
      });
    }

    return sendSuccess(reply, {
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    return sendCaughtError(request, reply, err, "generate request failed");
  }
}

export async function postCalculateFee(request, reply) {
  const { id: actor, ouId } = request.userContext;
  const scopeBranchId = resolveScopeBranchId(request.userContext);
  const { iv_id: ivId, action } = request.body;
  const ifMatch = request.headers["if-match"];
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await calculateFee({
      ivId,
      action,
      ifMatch,
      actor,
      ouId,
      scopeBranchId,
      log: request.log,
    });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(request, reply, err, "calculate-fee request failed");
  }
}

export async function getInvoiceList(request, reply) {
  const { ouId, branchId: activeBranchId, role } = request.userContext;
  const requestId = resolveRequestId(request.headers["x-request-id"]);
  const rawQuery = request.query ?? {};
  const query = resolveListInvoicesRequestQuery(rawQuery, {
    role,
    activeBranchId,
  });

  try {
    const result = await listInvoices({
      query,
      ouId,
    });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(request, reply, err, "list invoices request failed");
  }
}

export async function getInvoiceAgents(request, reply) {
  const { ouId, branchId, role } = request.userContext;
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await listInvoiceAgents({
      ouId,
      ensureBranchIds: branchId ? [branchId] : [],
      // Branch-pinned roles only ever see their own branch in the picker.
      restrictBranchId: canSwitchActiveBranchRole(role) ? undefined : branchId,
    });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(
      request,
      reply,
      err,
      "list invoice agents request failed",
    );
  }
}

export async function getAgentInvoiceDetail(request, reply) {
  const { ouId } = request.userContext;
  const scopeBranchId = resolveScopeBranchId(request.userContext);
  const { id } = request.params;
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await getInvoiceDetail({ id, ouId, scopeBranchId });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(request, reply, err, "get-detail request failed");
  }
}

export async function getInvoicesBatchHandler(request, reply) {
  const { ouId } = request.userContext;
  const scopeBranchId = resolveScopeBranchId(request.userContext);
  const { ids, include } = request.query ?? {};
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await getInvoicesBatch({
      idsParam: ids,
      includeTransactions: include === "transactions",
      ouId,
      scopeBranchId,
    });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(request, reply, err, "batch-get request failed");
  }
}

export async function getInvoiceTransactions(request, reply) {
  const { ouId } = request.userContext;
  const scopeBranchId = resolveScopeBranchId(request.userContext);
  const { id } = request.params;
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await listInvoiceTransactions({ id, ouId, scopeBranchId });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(
      request,
      reply,
      err,
      "list transactions request failed",
    );
  }
}

export async function putInvoiceStatus(request, reply) {
  const { id: actor, ouId } = request.userContext;
  const scopeBranchId = resolveScopeBranchId(request.userContext);
  const { id } = request.params;
  const { status } = request.body ?? {};
  const ifMatch = request.headers["if-match"];
  const requestId = resolveRequestId(request.headers["x-request-id"]);

  try {
    const result = await updateInvoiceStatus({
      id,
      status,
      actor,
      ouId,
      ifMatch,
      scopeBranchId,
    });
    return sendServiceResult(reply, result, requestId);
  } catch (err) {
    return sendCaughtError(request, reply, err, "update status request failed");
  }
}
