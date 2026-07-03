import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_BRANCHES_QUERY,
  normalizeBranchIdQuery,
  parseListInvoicesQuery,
  resolveInvoiceBranchScope,
  resolveListInvoicesRequestQuery,
  validateListInvoicesQuery,
} from "../list-invoices.query.js";

test("normalizeBranchIdQuery trims and ignores non-strings", () => {
  assert.equal(normalizeBranchIdQuery("  abc  "), "abc");
  assert.equal(normalizeBranchIdQuery(""), undefined);
  assert.equal(normalizeBranchIdQuery(["x"]), undefined);
  assert.equal(normalizeBranchIdQuery(undefined), undefined);
});

test("resolveInvoiceBranchScope pins branch for branch_admin", () => {
  assert.equal(
    resolveInvoiceBranchScope({
      rawBranchId: ALL_BRANCHES_QUERY,
      role: "branch_admin",
      activeBranchId: "665a3d76b1e5f8b9e6f2b9d1",
    }),
    "665a3d76b1e5f8b9e6f2b9d1",
  );
});

test("resolveInvoiceBranchScope allows all for platform_admin", () => {
  assert.equal(
    resolveInvoiceBranchScope({
      rawBranchId: ALL_BRANCHES_QUERY,
      role: "platform_admin",
      activeBranchId: "665a3d76b1e5f8b9e6f2b9d1",
    }),
    undefined,
  );
});

test("resolveListInvoicesRequestQuery coerces branch-pinned roles", () => {
  const query = resolveListInvoicesRequestQuery(
    { page: "1", branch_id: ALL_BRANCHES_QUERY },
    { role: "staff", activeBranchId: "665a3d76b1e5f8b9e6f2b9c1" },
  );
  assert.equal(query.branch_id, "665a3d76b1e5f8b9e6f2b9c1");
});

test("resolveListInvoicesRequestQuery strips all sentinel for OU-wide roles", () => {
  const query = resolveListInvoicesRequestQuery(
    { page: "1", branch_id: ALL_BRANCHES_QUERY, status: "READY" },
    { role: "platform_admin", activeBranchId: "665a3d76b1e5f8b9e6f2b9d1" },
  );
  assert.equal(query.branch_id, undefined);
  assert.equal(query.status, "READY");
});

test("parseListInvoicesQuery maps all sentinel to undefined branchId", () => {
  const parsed = parseListInvoicesQuery({ branch_id: ALL_BRANCHES_QUERY });
  assert.equal(parsed.branchId, undefined);
});

test("validateListInvoicesQuery rejects invalid branch ObjectId", () => {
  const parsed = parseListInvoicesQuery({ branch_id: "not-an-id" });
  const result = validateListInvoicesQuery(parsed);
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_PARAM");
});
