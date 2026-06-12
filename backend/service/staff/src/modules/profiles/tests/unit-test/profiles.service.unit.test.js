import { test, describe } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { HttpError } from "../../../../lib/http-error.js";
import CODES from "../../../../lib/error-codes.js";
import {
  assertAdminRole,
  assertAdminCanLinkUser,
  assertPlatformAdmin,
  tenantContextFromAuthUser,
  resolveGetByIdScope,
  assertAdminLifecycleAccess,
  assertPatchBodyAllowed,
} from "../../profiles.service.js";

const ouA = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const branchA2 = "507f1f77bcf86cd799439014";
const userSelf = "507f1f77bcf86cd799439013";
const userOther = "507f1f77bcf86cd799439015";

const platformAdmin = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "platform_admin",
};

const branchAdmin = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "branch_admin",
};

const staffUser = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "staff",
};

const supportUser = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "support",
};

describe("assertAdminRole", () => {
  test("does not throw for platform_admin", () => {
    assert.doesNotThrow(() => assertAdminRole(platformAdmin));
  });

  test("does not throw for branch_admin", () => {
    assert.doesNotThrow(() => assertAdminRole(branchAdmin));
  });

  test("throws 403 PERMISSION_DENIED for staff role", () => {
    assert.throws(
      () => assertAdminRole(staffUser),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 403);
        assert.strictEqual(error.code, CODES.PERMISSION_DENIED);
        return true;
      },
    );
  });

  test("does not throw for support", () => {
    assert.doesNotThrow(() => assertAdminRole(supportUser));
  });
});

describe("assertPlatformAdmin", () => {
  test("does not throw for platform_admin", () => {
    assert.doesNotThrow(() => assertPlatformAdmin(platformAdmin));
  });

  test("throws 403 for branch_admin", () => {
    assert.throws(
      () => assertPlatformAdmin(branchAdmin),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 403);
        assert.strictEqual(error.code, CODES.PERMISSION_DENIED);
        return true;
      },
    );
  });

  test("throws 403 for support", () => {
    assert.throws(
      () => assertPlatformAdmin(supportUser),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("throws 403 for staff", () => {
    assert.throws(
      () => assertPlatformAdmin(staffUser),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });
});

describe("assertAdminCanLinkUser", () => {
  const authUserSameOuSameBranch = {
    ou_id: new ObjectId(ouA),
    branch_id: new ObjectId(branchA1),
  };

  const authUserSameOuDifferentBranch = {
    ou_id: new ObjectId(ouA),
    branch_id: new ObjectId(branchA2),
  };

  const authUserDifferentOu = {
    ou_id: new ObjectId("507f1f77bcf86cd799439099"),
    branch_id: new ObjectId(branchA1),
  };

  test("platform_admin can link user in same OU regardless of branch", () => {
    assert.doesNotThrow(() =>
      assertAdminCanLinkUser(authUserSameOuDifferentBranch, platformAdmin),
    );
  });

  test("platform_admin cannot link user from different OU", () => {
    assert.throws(
      () => assertAdminCanLinkUser(authUserDifferentOu, platformAdmin),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === CODES.INVALID_USER_CONTEXT,
    );
  });

  test("branch_admin can link user in same OU and same branch", () => {
    assert.doesNotThrow(() =>
      assertAdminCanLinkUser(authUserSameOuSameBranch, branchAdmin),
    );
  });

  test("branch_admin cannot link user in different branch (same OU)", () => {
    assert.throws(
      () => assertAdminCanLinkUser(authUserSameOuDifferentBranch, branchAdmin),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === CODES.INVALID_USER_CONTEXT,
    );
  });

  test("branch_admin cannot link user from different OU", () => {
    assert.throws(
      () => assertAdminCanLinkUser(authUserDifferentOu, branchAdmin),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });
});

describe("tenantContextFromAuthUser", () => {
  test("maps authUser ObjectId fields to string and uses actorUserId", () => {
    const authUser = {
      ou_id: new ObjectId(ouA),
      branch_id: new ObjectId(branchA1),
    };

    const ctx = tenantContextFromAuthUser(authUser, userSelf);

    assert.strictEqual(ctx.userId, userSelf);
    assert.strictEqual(ctx.ouId, ouA);
    assert.strictEqual(ctx.branchId, branchA1);
  });
});

describe("resolveGetByIdScope", () => {
  test("platform_admin gets OU-wide scope (no branchId)", () => {
    const scope = resolveGetByIdScope(platformAdmin);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, undefined);
  });

  test("branch_admin gets branch-scoped scope", () => {
    const scope = resolveGetByIdScope(branchAdmin);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA1);
  });

  test("staff gets branch-scoped scope", () => {
    const scope = resolveGetByIdScope(staffUser);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA1);
  });

  test("support gets OU-wide scope (no branchId)", () => {
    const scope = resolveGetByIdScope(supportUser);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, undefined);
  });
});

describe("assertAdminLifecycleAccess", () => {
  const otherProfileInBranchA1 = {
    user_id: userOther,
    ou_id: ouA,
    branch_id: branchA1,
  };

  const otherProfileInBranchA2 = {
    user_id: userOther,
    ou_id: ouA,
    branch_id: branchA2,
  };

  const ownProfile = {
    user_id: userSelf,
    ou_id: ouA,
    branch_id: branchA1,
  };

  test("throws 403 for non-admin role", () => {
    assert.throws(
      () => assertAdminLifecycleAccess(otherProfileInBranchA1, staffUser),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("throws 403 when platform_admin tries to archive own profile", () => {
    assert.throws(
      () => assertAdminLifecycleAccess(ownProfile, platformAdmin),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === CODES.INVALID_USER_CONTEXT,
    );
  });

  test("throws 403 when branch_admin tries to archive own profile", () => {
    assert.throws(
      () => assertAdminLifecycleAccess(ownProfile, branchAdmin),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === CODES.INVALID_USER_CONTEXT,
    );
  });

  test("platform_admin can access another user's profile in same OU", () => {
    assert.doesNotThrow(() =>
      assertAdminLifecycleAccess(otherProfileInBranchA1, platformAdmin),
    );
  });

  test("platform_admin can access profile in another branch (same OU)", () => {
    assert.doesNotThrow(() =>
      assertAdminLifecycleAccess(otherProfileInBranchA2, platformAdmin),
    );
  });

  test("branch_admin can access another user in own branch", () => {
    assert.doesNotThrow(() =>
      assertAdminLifecycleAccess(otherProfileInBranchA1, branchAdmin),
    );
  });

  test("branch_admin cannot access profile in another branch", () => {
    assert.throws(
      () => assertAdminLifecycleAccess(otherProfileInBranchA2, branchAdmin),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("support can access another user's profile in same OU", () => {
    assert.doesNotThrow(() =>
      assertAdminLifecycleAccess(otherProfileInBranchA1, supportUser),
    );
  });

  test("support can access profile in another branch (same OU)", () => {
    assert.doesNotThrow(() =>
      assertAdminLifecycleAccess(otherProfileInBranchA2, supportUser),
    );
  });

  test("throws 403 when support tries to archive own profile", () => {
    assert.throws(
      () => assertAdminLifecycleAccess(ownProfile, supportUser),
      (error) =>
        error instanceof HttpError &&
        error.status === 403 &&
        error.code === CODES.INVALID_USER_CONTEXT,
    );
  });
});

describe("assertPatchBodyAllowed", () => {
  test("throws 400 for user_id in body", () => {
    assert.throws(
      () => assertPatchBodyAllowed({ user_id: userOther }),
      (error) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code === CODES.INVALID_PARAM,
    );
  });

  test("throws 400 for ou_id in body", () => {
    assert.throws(
      () => assertPatchBodyAllowed({ ou_id: ouA }),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("throws 400 for branch_id in body", () => {
    assert.throws(
      () => assertPatchBodyAllowed({ branch_id: branchA1 }),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("throws 400 for status in body", () => {
    assert.throws(
      () => assertPatchBodyAllowed({ status: "archived" }),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("throws 400 for password in body", () => {
    assert.throws(
      () => assertPatchBodyAllowed({ password: "secret" }),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });

  test("does not throw for allowed fields", () => {
    assert.doesNotThrow(() =>
      assertPatchBodyAllowed({
        code: "EMP-01",
        firstname: "Somchai",
        lastname: "Test",
        email: "test@example.com",
        tel: "+66812345678",
      }),
    );
  });

  test("does not throw for empty body", () => {
    assert.doesNotThrow(() => assertPatchBodyAllowed({}));
  });
});
