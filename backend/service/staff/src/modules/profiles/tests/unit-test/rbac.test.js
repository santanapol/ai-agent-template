import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

import { HttpError } from "../../../../lib/http-error.js";
import CODES from "../../../../lib/error-codes.js";
import { isAdminRole } from "@zero-platform/roles";
import {
  assertProfileScope,
  assertLookupQueryExclusive,
  resolveListScope,
  resolveLookupScope,
  assertPermission,
} from "../../profiles.service.js";
import {
  setRuntimeEnv,
  resetRuntimeEnvForTests,
} from "../../../../config/runtime-env.js";

const ouA = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const branchA2 = "507f1f77bcf86cd799439014";
const userSelf = "507f1f77bcf86cd799439013";
const userOther = "507f1f77bcf86cd799439015";

// Mock environment template
const baseEnv = {
  appName: "staff-service",
  nodeEnv: "test",
  port: 3101,
  dbName: "auth_login",
  mongoUri: "",
  gatewaySharedSecret: "test-gateway-secret-32-chars-minimum!!",
  authInternalBaseUrl: "http://127.0.0.1:3001",
  authInternalServiceSecret: "internal-secret",
  staffProvisionDefaultRole: "staff",
  shutdownTimeoutMs: 5000,
  bodyLimit: "1mb",
  maxPoolSize: 10,
  minPoolSize: 2,
  authRevokeMaxRetries: 3,
  authRevokeBackoffMs: 200,
  permissionMode: "dual",
};

const platformAdmin = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "platform_admin",
  permissions: ["profiles:*", "roles:assign"],
};

const branchAdmin = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "branch_admin",
  permissions: ["profiles:*"],
};

const staffUser = {
  userId: userSelf,
  ouId: ouA,
  branchId: branchA1,
  role: "staff",
  permissions: [],
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
  beforeEach(() => {
    setRuntimeEnv({ ...baseEnv });
  });

  afterEach(() => {
    resetRuntimeEnvForTests();
  });

  test("isAdminRole identifies admin roles", () => {
    assert.strictEqual(isAdminRole("platform_admin"), true);
    assert.strictEqual(isAdminRole("branch_admin"), true);
    assert.strictEqual(isAdminRole("support_admin"), true);
    assert.strictEqual(isAdminRole("support"), true);
    assert.strictEqual(isAdminRole("staff"), false);
  });

  describe("assertPermission", () => {
    test("passes when exact permission key matches", () => {
      const context = { ...staffUser, permissions: ["profiles:read"] };
      assert.doesNotThrow(() => assertPermission(context, "profiles:read"));
    });

    test("passes when wildcard permission key matches", () => {
      const context = { ...branchAdmin, permissions: ["profiles:*"] };
      assert.doesNotThrow(() => assertPermission(context, "profiles:read"));
    });

    test("throws 403 PERMISSION_DENIED when no permission matches in enforce mode", () => {
      setRuntimeEnv({ ...baseEnv, permissionMode: "enforce" });
      const context = { ...staffUser, permissions: ["profiles:read"] };

      assert.throws(
        () => assertPermission(context, "profiles:create"),
        (error) => {
          assert.ok(error instanceof HttpError);
          assert.strictEqual(error.status, 403);
          assert.strictEqual(error.code, CODES.PERMISSION_DENIED);
          return true;
        },
      );
    });

    test("passes when no permission matches but legacy role check passes in dual mode", () => {
      setRuntimeEnv({ ...baseEnv, permissionMode: "dual" });
      const context = { ...branchAdmin, permissions: [] }; // ไม่มี permission แต่เป็น branch_admin

      assert.doesNotThrow(() =>
        assertPermission(context, "profiles:create", {
          legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
        }),
      );
    });

    test("throws 403 when no permission matches and legacy role check fails in dual mode", () => {
      setRuntimeEnv({ ...baseEnv, permissionMode: "dual" });
      const context = { ...staffUser, permissions: [] }; // staff ไม่มี permission และ role ไม่ผ่าน

      assert.throws(
        () =>
          assertPermission(context, "profiles:create", {
            legacyRoleCheck: (ctx) => isAdminRole(ctx.role),
          }),
        (error) => error instanceof HttpError && error.status === 403,
      );
    });
  });

  test("resolveListScope — staff receives 403", () => {
    assert.throws(
      () => resolveListScope(staffUser),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 403);
        assert.strictEqual(error.code, CODES.PERMISSION_DENIED);
        return true;
      },
    );
  });

  test("resolveListScope — platform_admin defaults to x-user-branch (AC-7)", () => {
    const scope = resolveListScope(platformAdmin, { branch_id: branchA2 });
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA2);

    const defaultScope = resolveListScope(platformAdmin);
    assert.strictEqual(defaultScope.ouId, ouA);
    assert.strictEqual(defaultScope.branchId, branchA1);
  });

  test("resolveListScope — switched active branch scopes list", () => {
    const switchedAdmin = {
      ...platformAdmin,
      branchId: branchA2,
      homeBranchId: branchA1,
    };
    const scope = resolveListScope(switchedAdmin);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, branchA2);
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
      assertProfileScope(profileInBranchA2, platformAdmin, "profiles:read"),
    );
  });

  test("assertProfileScope — branch_admin cannot read profile in another branch", () => {
    assert.throws(
      () => assertProfileScope(profileInBranchA2, branchAdmin, "profiles:read"),
      (error) => error instanceof HttpError && error.status === 403,
    );
  });

  test("assertProfileScope — branch_admin may read profile in own branch", () => {
    assert.doesNotThrow(() =>
      assertProfileScope(profileInBranchA1, branchAdmin, "profiles:read"),
    );
  });

  test("assertProfileScope — self may read own profile", () => {
    assert.doesNotThrow(() =>
      assertProfileScope(ownProfile, staffUser, "profiles:read"),
    );
  });

  test("assertProfileScope — self passes when active branch differs from home branch", () => {
    const switchedAdmin = {
      ...platformAdmin,
      branchId: branchA2,
      homeBranchId: branchA1,
    };
    assert.doesNotThrow(() =>
      assertProfileScope(ownProfile, switchedAdmin, "profiles:read"),
    );
  });

  test("resolveLookupScope — OU-wide self lookup is OU-scoped (active may differ from home)", () => {
    const switchedAdmin = {
      ...platformAdmin,
      branchId: branchA2,
      homeBranchId: branchA1,
    };
    const scope = resolveLookupScope(switchedAdmin, userSelf);
    assert.strictEqual(scope.ouId, ouA);
    assert.strictEqual(scope.branchId, undefined);
  });

  test("assertProfileScope — OU-wide self passes without home branch when active differs", () => {
    const switchedAdmin = {
      ...platformAdmin,
      branchId: branchA2,
    };
    assert.doesNotThrow(() =>
      assertProfileScope(ownProfile, switchedAdmin, "profiles:read"),
    );
  });

  test("assertProfileScope — staff cannot read another user profile", () => {
    assert.throws(
      () => assertProfileScope(profileInBranchA1, staffUser, "profiles:read"),
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
