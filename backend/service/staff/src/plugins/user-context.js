import fp from "fastify-plugin";
import { ObjectId } from "mongodb";
import { isValidRole } from "@zero-platform/roles";
import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

function readHeader(request, name) {
  const value = request.headers[name];
  return typeof value === "string" ? value.trim() : "";
}

function parseHexObjectId(value, fieldLabel) {
  if (!/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new HttpError(
      403,
      CODES.INVALID_USER_CONTEXT,
      `Invalid ${fieldLabel}`,
    );
  }
  return new ObjectId(value);
}

export default fp(async function userContextGuard(fastify) {
  fastify.addHook("onRequest", async (request, _reply) => {
    const userId = readHeader(request, "x-user-id");
    const userOu = readHeader(request, "x-user-ou");
    const userBranch = readHeader(request, "x-user-branch");
    const rawHomeBranch = readHeader(request, "x-user-home-branch");
    const role = readHeader(request, "x-user-role");
    const rawPermissions = readHeader(request, "x-user-permissions");

    if (!userId || !userOu || !userBranch || !role) {
      throw new HttpError(
        403,
        CODES.MISSING_GATEWAY_USER_CONTEXT,
        "Missing required user context headers",
      );
    }

    if (!isValidRole(role)) {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "Invalid x-user-role",
      );
    }

    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      throw new HttpError(403, CODES.INVALID_USER_CONTEXT, "Invalid x-user-id");
    }

    const ouObjectId = parseHexObjectId(userOu, "x-user-ou");
    const branchObjectId = parseHexObjectId(userBranch, "x-user-branch");
    const permissions = rawPermissions === "" ? [] : rawPermissions.split(",");
    const homeBranchFields =
      rawHomeBranch !== ""
        ? {
            homeBranchId: rawHomeBranch,
            homeBranchObjectId: parseHexObjectId(
              rawHomeBranch,
              "x-user-home-branch",
            ),
          }
        : {};

    request.userContext = {
      userId,
      ouId: userOu,
      branchId: userBranch,
      ...homeBranchFields,
      role,
      ouObjectId,
      branchObjectId,
      permissions,
    };
  });
});
