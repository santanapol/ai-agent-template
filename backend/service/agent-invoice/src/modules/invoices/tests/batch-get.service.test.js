import test from "node:test";
import assert from "node:assert";

import {
  getInvoicesBatch,
  MAX_BATCH_IDS,
  parseBatchIds,
} from "../batch-get.service.js";

const VALID_ID = "665a3d76b1e5f8b9e6f2b3d1";
const VALID_ID_2 = "665a3d76b1e5f8b9e6f2b3d2";
const VALID_OU = "000000000000000000000456";
const OTHER_OU = "000000000000000000000999";
const BRANCH_ID = "000000000000000000000789";

test("parseBatchIds — rejects empty and malformed", () => {
  assert.deepEqual(parseBatchIds(""), { ok: false, code: "INVALID_PARAM" });
  assert.deepEqual(parseBatchIds("bad-id"), {
    ok: false,
    code: "INVALID_PARAM",
  });
});

test("parseBatchIds — rejects over cap", () => {
  const ids = Array.from({ length: MAX_BATCH_IDS + 1 }, (_, i) =>
    String(i).padStart(24, "0"),
  ).join(",");
  assert.deepEqual(parseBatchIds(ids), { ok: false, code: "INVALID_PARAM" });
});

test("parseBatchIds — dedupes ids", () => {
  const parsed = parseBatchIds(`${VALID_ID},${VALID_ID}`);
  assert.strictEqual(parsed.ok, true);
  assert.deepEqual(parsed.ids, [VALID_ID]);
});

test("getInvoicesBatch — returns items and missing", async () => {
  const result = await getInvoicesBatch({
    idsParam: `${VALID_ID},${VALID_ID_2}`,
    ouId: VALID_OU,
    _repos: {
      invoice: {
        findDetailByIds: async () => [
          {
            _id: VALID_ID,
            ou_id: VALID_OU,
            branch_id: BRANCH_ID,
            iv_no: "IV-001",
            status: "READY",
            amount: 100,
            upd_date: new Date("2025-01-01T00:00:00.000Z"),
          },
        ],
      },
      masterData: {
        findBranchDisplayName: async () => "Branch A",
        findOuDisplayName: async () => "OU A",
        findGameCompanyNamesByIds: async () => new Map(),
        findGameMainCategoryNamesByIds: async () => new Map(),
      },
      transaction: {
        findByInvoiceIds: async () => [],
      },
      findAgentByOuAndBranchId: async () => ({ currency: "thb" }),
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.items.length, 1);
  assert.strictEqual(result.data.items[0].currency, "THB");
  assert.deepEqual(result.data.missing, [VALID_ID_2]);
});

test("getInvoicesBatch — embeds transactions when include=transactions", async () => {
  const result = await getInvoicesBatch({
    idsParam: VALID_ID,
    includeTransactions: true,
    ouId: VALID_OU,
    _repos: {
      invoice: {
        findDetailByIds: async () => [
          {
            _id: VALID_ID,
            ou_id: VALID_OU,
            branch_id: BRANCH_ID,
            iv_no: "IV-001",
            status: "READY",
            amount: 100,
            upd_date: new Date("2025-01-01T00:00:00.000Z"),
          },
        ],
      },
      masterData: {
        findBranchDisplayName: async () => "Branch A",
        findOuDisplayName: async () => "OU A",
        findOrganizationNameByOuId: async () => "OU A",
        findGameCompanyNamesByIds: async () => new Map([["c1", "Company"]]),
        findGameMainCategoryNamesByIds: async () => new Map([["cat1", "Cat"]]),
      },
      transaction: {
        findByInvoiceIds: async () => [
          {
            _id: "txn1",
            ref_iv_id: VALID_ID,
            ou_id: VALID_OU,
            branch_id: BRANCH_ID,
            company_id: "c1",
            main_category_id: "cat1",
            net_win: 1,
            bet: 2,
            fee: 3,
            amount: 4,
            cr_by: "u",
            cr_prog: "p",
            cr_date: new Date(),
            upd_by: "u",
            upd_prog: "p",
            upd_date: new Date(),
          },
        ],
      },
      findAgentByOuAndBranchId: async () => null,
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.items[0].transactions?.length, 1);
  assert.strictEqual(
    result.data.items[0].transactions[0].company_name,
    "Company",
  );
});

test("getInvoicesBatch — out-of-scope ids land in missing only", async () => {
  const result = await getInvoicesBatch({
    idsParam: VALID_ID,
    ouId: OTHER_OU,
    _repos: {
      invoice: {
        findDetailByIds: async (_ids, ouId) => {
          assert.strictEqual(ouId, OTHER_OU);
          return [];
        },
      },
      masterData: {},
      transaction: { findByInvoiceIds: async () => [] },
      findAgentByOuAndBranchId: async () => null,
    },
  });

  assert.strictEqual(result.success, true);
  assert.deepEqual(result.data.items, []);
  assert.deepEqual(result.data.missing, [VALID_ID]);
});
