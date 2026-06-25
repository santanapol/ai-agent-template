import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { VALID_ROLES, VALID_ROLES_SET, isValidRole, isAdminRole, OU_WIDE_STAFF_ROLES } from "../index.js";

describe("@zero-platform/roles", () => {
  test("VALID_ROLES_SET matches VALID_ROLES array", () => {
    assert.equal(VALID_ROLES_SET.size, VALID_ROLES.length);
    for (const role of VALID_ROLES) {
      assert.ok(VALID_ROLES_SET.has(role));
    }
  });

  test("isValidRole accepts all canonical roles", () => {
    for (const role of VALID_ROLES) {
      assert.equal(isValidRole(role), true);
    }
  });

  test("isValidRole rejects unknown roles", () => {
    assert.equal(isValidRole("super_admin"), false);
    assert.equal(isValidRole(""), false);
    assert.equal(isValidRole(null), false);
  });

  test("isAdminRole identifies admin subset", () => {
    assert.equal(isAdminRole("platform_admin"), true);
    assert.equal(isAdminRole("support_admin"), true);
    assert.equal(isAdminRole("staff"), false);
  });

  test("OU_WIDE_STAFF_ROLES contains expected roles", () => {
    assert.ok(OU_WIDE_STAFF_ROLES.has("platform_admin"));
    assert.ok(OU_WIDE_STAFF_ROLES.has("support"));
    assert.ok(OU_WIDE_STAFF_ROLES.has("support_admin"));
    assert.equal(OU_WIDE_STAFF_ROLES.has("branch_admin"), false);
  });
});
