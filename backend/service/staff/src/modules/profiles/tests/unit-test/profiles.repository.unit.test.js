import { test, describe } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import {
  mapToApi,
  buildScopeFilter,
  parseListSort,
  toObjectId,
} from "../../profiles.repository.js";

describe("profiles.repository (unit)", () => {
  test("mapToApi omits cr_* and upd_* and maps ids", () => {
    const id = new ObjectId();
    const userId = new ObjectId();
    const ouId = new ObjectId();
    const branchId = new ObjectId();

    const api = mapToApi(
      {
        _id: id,
        user_id: userId,
        ou_id: ouId,
        branch_id: branchId,
        status: "active",
        code: "EMP-T06",
        firstname: "Test",
        lastname: "User",
        email: "test@example.invalid",
        tel: "+66800000001",
        cr_by: "actor",
        cr_date: new Date(),
        cr_prog: "POST /api/v1/staff/profiles",
        upd_by: "actor",
        upd_date: new Date(),
        upd_prog: "POST /api/v1/staff/profiles",
      },
      { username: "test.user", role: "staff" },
    );

    assert.strictEqual(api.id, id.toString());
    assert.strictEqual(api.user_id, userId.toString());
    assert.strictEqual(api.user.username, "test.user");
    assert.strictEqual(api.user.role, "staff");
    assert.strictEqual(api.code, "EMP-T06");
    assert.strictEqual(Object.hasOwn(api, "cr_by"), false);
    assert.strictEqual(Object.hasOwn(api, "upd_date"), false);
  });

  test("mapToApi returns null for null doc", () => {
    assert.strictEqual(mapToApi(null), null);
  });

  test("mapToApi handles nullish user_id", () => {
    const id = new ObjectId();
    const ouId = new ObjectId();
    const branchId = new ObjectId();

    const api = mapToApi({
      _id: id,
      user_id: null,
      ou_id: ouId,
      branch_id: branchId,
      status: "active",
      code: "EMP-PROV",
      firstname: "Prov",
      lastname: "User",
      email: "prov@example.invalid",
      tel: "+66800000002",
    });

    assert.strictEqual(api.id, id.toString());
    assert.strictEqual(api.user_id, null);
    assert.strictEqual(api.code, "EMP-PROV");
  });

  test("parseListSort supports ascending and descending fields", () => {
    assert.deepStrictEqual(parseListSort("-upd_date"), { upd_date: -1 });
    assert.deepStrictEqual(parseListSort("code"), { code: 1 });
  });

  test("parseListSort throws for invalid field", () => {
    assert.throws(() => parseListSort("invalid_field"), {
      message: "Invalid sort field: invalid_field",
    });
  });

  test("buildScopeFilter always includes ou_id and optional branch_id", () => {
    const ouId = "507f1f77bcf86cd799439011";
    const branchId = "507f1f77bcf86cd799439012";

    const ouOnly = buildScopeFilter({ ouId });
    assert.ok(ouOnly.ou_id.equals(toObjectId(ouId)));
    assert.strictEqual(ouOnly.branch_id, undefined);

    const withBranch = buildScopeFilter({ ouId, branchId });
    assert.ok(withBranch.branch_id.equals(toObjectId(branchId)));
  });
});
