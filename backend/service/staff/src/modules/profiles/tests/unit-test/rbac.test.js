import { test, describe } from "node:test";
import assert from "node:assert";

import { HttpError } from "../../../../lib/http-error.js";
import CODES from "../../../../lib/error-codes.js";
import {
  assertProfileScope,
  assertLookupQueryExclusive,
  resolveListScope,
  resolveLookupScope,
  isAdminRole,
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

const profileInBranchA1 = {
  user_id: userOther,
  ou_id: ouA,
  branch_id: branchA1,
};

const profileInBranchA2 = {
  user_id: userOther,
  ou_id: ouA,
  branch_id: branchA2,
};

const ownProfile = {
  user_id: userSelf,
  ou_id: ouA,
  branch_id: branchA1,
};

describe("profiles RBAC / scope", () => {
  test("isAdminRole identifies admin roles", () => {
    assert.strictEqual(isAdminRole("platform_admin"), true);
    assert.strictEqual(isAdminRole("branch_admin"), true);
    assert.strictEqual(isAdminRole("staff"), false);
  });

  test("resolveListScope — staff receives 403", () => {
    assert.throws(
      () => resolveListScope(staffUser),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 403);
        assert.strictEqual(error.code, CODES.INVALID_USER_CONTEXT);
        return true;
      },
    );
  });

  test("resolveListScope — platform_admin may filter optional branch", () => {
    const scope = resolveListScope(platformAdmin, { branch_id: branchA2 });
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA2);

    const ouWide = resolveListScope(platformAdmin);
    assert.strictEqual(ouWide.ouId, ouA);
    assert.strictEqual(ouWide.branchId, undefined);
  });

  test("resolveListScope — branch_admin is pinned to caller branch", () => {
    const scope = resolveListScope(branchAdmin);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA1);
  });

  test("resolveListScope — branch_admin rejects foreign branch_id filter", () => {
    assert.throws(
      () => resolveListScope(branchAdmin, { branch_id: branchA2 }),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("assertProfileScope — platform_admin may read profile in another branch (same OU)", () => {
    assert.doesNotThrow(() =>
      assertProfileScope(profileInBranchA2, platformAdmin),
    );
  });

  test("assertProfileScope — branch_admin cannot read profile in another branch", () => {
    assert.throws(
      () => assertProfileScope(profileInBranchA2, branchAdmin),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("assertProfileScope — branch_admin may read profile in own branch", () => {
    assert.doesNotThrow(() =>
      assertProfileScope(profileInBranchA1, branchAdmin),
    );
  });

  test("assertProfileScope — self may read own profile", () => {
    assert.doesNotThrow(() => assertProfileScope(ownProfile, staffUser));
  });

  test("assertProfileScope — staff cannot read another user profile", () => {
    assert.throws(
      () => assertProfileScope(profileInBranchA1, staffUser),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("resolveLookupScope — self uses caller tenant", () => {
    const scope = resolveLookupScope(staffUser, userSelf);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA1);
  });

  test("resolveLookupScope — staff cannot lookup another user", () => {
    assert.throws(
      () => resolveLookupScope(staffUser, userOther),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("resolveLookupScope — platform_admin lookup is OU-wide", () => {
    const scope = resolveLookupScope(platformAdmin, userOther);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, undefined);
  });

  test("assertLookupQueryExclusive rejects user_id with list params", () => {
    assert.throws(
      () =>
        assertLookupQueryExclusive({
          user_id: userSelf,
          page: 1,
        }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 400);
        assert.strictEqual(error.code, CODES.INVALID_PARAM);
        return true;
      },
    );
  });

  test("assertLookupQueryExclusive allows user_id alone", () => {
    assert.doesNotThrow(() =>
      assertLookupQueryExclusive({ user_id: userSelf }),
    );
  });
});
