import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { mergeEnsuredInvoiceAgentBranches } from "./list-invoice-agents.service.js";

test("mergeEnsuredInvoiceAgentBranches adds active branch when absent from OU list", async () => {
  const ouId = "5f4f9d57266ed249e45ecef5";
  const extraBranchId = "5f4fb5bb3156af7a2db9e5a0";

  const merged = await mergeEnsuredInvoiceAgentBranches(
    [],
    ouId,
    [extraBranchId],
    async (branchId) => {
      if (branchId !== extraBranchId) return null;
      return {
        _id: new ObjectId(extraBranchId),
        ou_id: new ObjectId(ouId),
        branch_name: "777WW",
        branch_code: "7W",
        active: "1",
      };
    },
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].branch_id, extraBranchId);
  assert.equal(merged[0].branch_name, "777WW");
});

test("mergeEnsuredInvoiceAgentBranches skips branch outside caller OU", async () => {
  const ouId = "5f4f9d57266ed249e45ecef5";
  const otherOuBranchId = "665a3d76b1e5f8b9e6f2b9d1";

  const merged = await mergeEnsuredInvoiceAgentBranches(
    [],
    ouId,
    [otherOuBranchId],
    async () => ({
      _id: new ObjectId(otherOuBranchId),
      ou_id: new ObjectId("665a3d76b1e5f8b9e6f2b9d2"),
      branch_name: "Other",
      branch_code: "OTH",
      active: "1",
    }),
  );

  assert.equal(merged.length, 0);
});
