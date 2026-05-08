"use strict";

const HttpError = require("../../utils/http-error");
const CODES = require("../../utils/error-codes");
const repository = require("./billing.repository");

const READ_ROLES = new Set(["owner", "admin", "manager", "billing"]);
const MANAGE_ROLES = new Set(["owner", "admin"]);

function normalizeRole(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function authorizeScope({ role, userOu, userBranch, ouId, branchId, manage }) {
  if (userOu !== ouId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Requested OU scope does not match caller context",
    );
  }

  if (manage) {
    if (!MANAGE_ROLES.has(role)) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Role is not allowed to manage billing",
      );
    }
    return;
  }

  if (!READ_ROLES.has(role)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Role is not allowed to read billing",
    );
  }

  if (role === "manager" || role === "billing") {
    if (userBranch !== branchId) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Role can read billing only in own branch",
      );
    }
  }
}

async function getPlan({ params, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorizeScope({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
    manage: false,
  });
  return repository.getPlan(params.ouId, params.branchId);
}

async function listInvoices({ params, query, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorizeScope({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
    manage: false,
  });
  return repository.listInvoices(params.ouId, params.branchId, query);
}

async function updatePlan({ params, body, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorizeScope({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
    manage: true,
  });
  return repository.updatePlan(
    params.ouId,
    params.branchId,
    { planCode: body.planCode },
    userContext.userId,
  );
}

module.exports = {
  getPlan,
  listInvoices,
  updatePlan,
};
