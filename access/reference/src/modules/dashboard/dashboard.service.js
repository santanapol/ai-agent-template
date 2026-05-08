"use strict";

const HttpError = require("../../utils/http-error");
const CODES = require("../../utils/error-codes");
const repository = require("./dashboard.repository");

const FULL_ACCESS_ROLES = new Set(["owner", "admin", "manager", "billing"]);
const BRANCH_SCOPED_ROLES = new Set(["manager", "billing", "member"]);

function normalizeRole(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function authorize({ role, userOu, userBranch, ouId, branchId }) {
  if (userOu !== ouId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Requested OU scope does not match caller context",
    );
  }

  if (!FULL_ACCESS_ROLES.has(role) && role !== "member") {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Role is not allowed to access dashboard",
    );
  }

  if (BRANCH_SCOPED_ROLES.has(role) && userBranch !== branchId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Role can access dashboard only in own branch",
    );
  }
}

function projectWidgetsByRole(role, summary) {
  if (role === "member") {
    return {
      widgets: {
        items: { total: summary.itemsTotal },
      },
      visibility: "limited",
    };
  }

  return {
    widgets: {
      sales: { totalRevenue: 0 },
      invoices: { open: summary.openInvoicesTotal },
      members: { total: summary.membersTotal },
      items: { total: summary.itemsTotal },
    },
    visibility: "full",
  };
}

async function getSummary({ params, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorize({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
  });

  const summary = await repository.getSummaryData(params.ouId, params.branchId);
  return {
    ...projectWidgetsByRole(normalizedRole, summary),
    refreshedAt: summary.refreshedAt,
  };
}

module.exports = {
  getSummary,
};
