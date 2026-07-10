import test from "node:test";
import assert from "node:assert";

import { getInvoiceDetail } from "../get-detail.service.js";

const VALID_ID = "665a3d76b1e5f8b9e6f2b3d1";
const VALID_OU = "000000000000000000000456";
const BRANCH_ID = "000000000000000000000789";

test("getInvoiceDetail — returns INVALID_PARAM for malformed id", async () => {
  const result = await getInvoiceDetail({ id: "bad-id", ouId: VALID_OU });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "INVALID_PARAM");
});

test("getInvoiceDetail — returns RESOURCE_NOT_FOUND when missing", async () => {
  const result = await getInvoiceDetail({
    id: VALID_ID,
    ouId: VALID_OU,
    _repos: {
      invoice: { findDetailById: async () => null },
      masterData: {},
      findAgentByBranchId: async () => null,
    },
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "RESOURCE_NOT_FOUND");
});

test("getInvoiceDetail — includes uppercase currency from agent", async () => {
  const result = await getInvoiceDetail({
    id: VALID_ID,
    ouId: VALID_OU,
    _repos: {
      invoice: {
        findDetailById: async () => ({
          _id: VALID_ID,
          ou_id: VALID_OU,
          branch_id: BRANCH_ID,
          iv_no: "IV-001",
          status: "READY",
          amount: 100,
          upd_date: new Date("2025-01-01T00:00:00.000Z"),
        }),
      },
      masterData: {
        findBranchDisplayName: async () => "Branch A",
        findOuDisplayName: async () => "OU A",
      },
      findAgentByBranchId: async () => ({ currency: "thb" }),
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.currency, "THB");
  assert.strictEqual(result.data.branch_name, "Branch A");
});

test("getInvoiceDetail — currency null when no agent", async () => {
  const result = await getInvoiceDetail({
    id: VALID_ID,
    ouId: VALID_OU,
    _repos: {
      invoice: {
        findDetailById: async () => ({
          _id: VALID_ID,
          ou_id: VALID_OU,
          branch_id: BRANCH_ID,
          iv_no: "IV-001",
          status: "READY",
          amount: 100,
          upd_date: new Date("2025-01-01T00:00:00.000Z"),
        }),
      },
      masterData: {
        findBranchDisplayName: async () => "Branch A",
        findOuDisplayName: async () => "OU A",
      },
      findAgentByBranchId: async () => null,
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.currency, null);
});
