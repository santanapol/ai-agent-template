import test from "node:test";
import assert from "node:assert";

import {
  mapInvoiceForApi,
  mapInvoiceListItemForApi,
  normalizeInvoiceCurrency,
} from "./invoice-serialize.js";

const DOC = {
  _id: "665a3d76b1e5f8b9e6f2b3d1",
  ou_id: "000000000000000000000456",
  branch_id: "000000000000000000000789",
  iv_no: "IV-001",
  billing_month: "2026-07",
  due_date: "2026-07-15",
  net_win: 1,
  bet: 2,
  amount: 3,
  status: "READY",
  cr_by: "u",
  cr_prog: "p",
  cr_date: "2026-07-01T00:00:00.000Z",
  upd_by: "u",
  upd_prog: "p",
  upd_date: "2026-07-01T00:00:00.000Z",
};

test("normalizeInvoiceCurrency uppercases and trims", () => {
  assert.strictEqual(normalizeInvoiceCurrency("thb"), "THB");
  assert.strictEqual(normalizeInvoiceCurrency(" THB "), "THB");
  assert.strictEqual(normalizeInvoiceCurrency(""), null);
  assert.strictEqual(normalizeInvoiceCurrency(null), null);
  assert.strictEqual(normalizeInvoiceCurrency(undefined), null);
});

test("mapInvoiceForApi includes uppercase currency from names", () => {
  const mapped = mapInvoiceForApi(DOC, {
    branchName: "Branch A",
    ouName: "OU A",
    currency: "thb",
  });
  assert.strictEqual(mapped.currency, "THB");
});

test("mapInvoiceForApi sets currency null when agent currency missing", () => {
  const mapped = mapInvoiceForApi(DOC, { branchName: "Branch A", ouName: "OU A" });
  assert.strictEqual(mapped.currency, null);
});

test("mapInvoiceListItemForApi does not include currency", () => {
  const mapped = mapInvoiceListItemForApi(DOC, { branchName: "Branch A" });
  assert.strictEqual("currency" in mapped, false);
});
