"use strict";

const HttpError = require("../../utils/http-error");
const CODES = require("../../utils/error-codes");
const repository = require("./members.repository");

const MANAGER_ROLES = new Set(["owner", "admin", "manager"]);

function normalizeRole(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function authorizeMembersAccess({ role, userOu, userBranch, ouId, branchId }) {
  if (userOu !== ouId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Requested OU scope does not match caller context",
    );
  }

  if (!MANAGER_ROLES.has(role)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Role is not allowed to manage members",
    );
  }

  if (role === "manager" && userBranch !== branchId) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      "Manager can manage members only in their own branch",
    );
  }
}

async function listMembers({ params, query, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorizeMembersAccess({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
  });

  return repository.listMembers({
    ouId: params.ouId,
    branchId: params.branchId,
    page: query.page,
    limit: query.limit,
  });
}

async function createMember({
  params,
  body,
  userContext,
  role,
  routeTemplate,
}) {
  const normalizedRole = normalizeRole(role);
  authorizeMembersAccess({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
  });

  return repository.createMember({
    ouId: params.ouId,
    branchId: params.branchId,
    body,
    actorUserId: userContext.userId,
    routeTemplate,
  });
}

async function updateMember({
  params,
  body,
  userContext,
  role,
  routeTemplate,
}) {
  const normalizedRole = normalizeRole(role);
  authorizeMembersAccess({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
  });

  const updated = await repository.updateMember({
    ouId: params.ouId,
    branchId: params.branchId,
    userId: params.userId,
    patch: body,
    actorUserId: userContext.userId,
    routeTemplate,
  });

  if (!updated) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "Member not found in this branch scope",
    );
  }

  return repository.mapMember(updated);
}

async function removeMember({ params, userContext, role }) {
  const normalizedRole = normalizeRole(role);
  authorizeMembersAccess({
    role: normalizedRole,
    userOu: userContext.ouId,
    userBranch: userContext.branchId,
    ouId: params.ouId,
    branchId: params.branchId,
  });

  const deletedCount = await repository.removeMember({
    ouId: params.ouId,
    branchId: params.branchId,
    userId: params.userId,
  });

  if (!deletedCount) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "Member not found in this branch scope",
    );
  }
}

module.exports = {
  listMembers,
  createMember,
  updateMember,
  removeMember,
};
