import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import buildApp from "../../../../app.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import { getInvoiceDatabase } from "../../../../config/database-invoice.js";
import { MAX_BATCH_IDS } from "../../batch-get.service.js";

describe("GET /api/v1/invoices/batch", () => {
  let app;
  const ouId = "665a3d76b1e5f8b9e6f2b9b1";
  const homeBranchId = "665a3d76b1e5f8b9e6f2b9c1";
  const activeBranchId = "665a3d76b1e5f8b9e6f2b9d1";
  const mockUserId = "test_invoice_batch_user";
  const ivPrefix = `T-BATCH-${Date.now()}`;
  const now = new Date("2026-01-15T10:00:00.000Z");

  /** @type {import('mongodb').ObjectId} */
  let homeInvoiceId;
  /** @type {import('mongodb').ObjectId} */
  let activeInvoiceId;

  async function cleanupInvoices() {
    const db = getInvoiceDatabase();
    await db.collection("agent_iv").deleteMany({
      iv_no: { $regex: `^${ivPrefix}` },
    });
    await db.collection("agent_iv_transaction").deleteMany({
      cr_prog: "test/invoices.batch",
    });
  }

  before(async () => {
    app = await buildApp({ logger: false });
    await cleanupInvoices();

    const db = getInvoiceDatabase();
    const base = {
      ou_id: new ObjectId(ouId),
      billing_month: "2026-01",
      due_date: now,
      net_win: 0,
      bet: 0,
      amount: 100,
      status: "READY",
      cr_by: mockUserId,
      cr_prog: "test/invoices.batch",
      cr_date: now,
      upd_by: mockUserId,
      upd_prog: "test/invoices.batch",
      upd_date: now,
    };

    const home = await db.collection("agent_iv").insertOne({
      ...base,
      branch_id: new ObjectId(homeBranchId),
      iv_no: `${ivPrefix}-HOME`,
    });
    const active = await db.collection("agent_iv").insertOne({
      ...base,
      branch_id: new ObjectId(activeBranchId),
      iv_no: `${ivPrefix}-ACTIVE`,
    });
    homeInvoiceId = home.insertedId;
    activeInvoiceId = active.insertedId;

    await db.collection("agent_iv_transaction").insertOne({
      ref_iv_id: activeInvoiceId,
      ou_id: new ObjectId(ouId),
      branch_id: new ObjectId(activeBranchId),
      company_id: new ObjectId("665a3d76b1e5f8b9e6f2b001"),
      main_category_id: new ObjectId("665a3d76b1e5f8b9e6f2b002"),
      net_win: 10,
      bet: 20,
      fee: 5,
      amount: 15,
      cr_by: mockUserId,
      cr_prog: "test/invoices.batch",
      cr_date: now,
      upd_by: mockUserId,
      upd_prog: "test/invoices.batch",
      upd_date: now,
    });
  });

  after(async () => {
    try {
      await cleanupInvoices();
    } finally {
      if (app) await app.close();
    }
  });

  const platformHeaders = () =>
    buildMeshHeaders({
      ouId,
      userId: mockUserId,
      role: "platform_admin",
      branchId: activeBranchId,
      permissions: "invoices:*",
    });

  test("returns enriched items and missing ids", async () => {
    const missingId = "665a3d76b1e5f8b9e6f2bfff";
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/batch?ids=${activeInvoiceId},${missingId}`,
      headers: platformHeaders(),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.data.items.length, 1);
    assert.strictEqual(body.data.items[0]._id, String(activeInvoiceId));
    assert.deepEqual(body.data.missing, [missingId]);
  });

  test("include=transactions embeds transactions per item", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/batch?ids=${activeInvoiceId}&include=transactions`,
      headers: platformHeaders(),
    });

    assert.strictEqual(res.statusCode, 200);
    const item = res.json().data.items[0];
    assert.ok(Array.isArray(item.transactions));
    assert.strictEqual(item.transactions.length, 1);
    assert.strictEqual(item.transactions[0].ref_iv_id, String(activeInvoiceId));
  });

  test("branch_admin cannot read invoice from another branch in batch", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/batch?ids=${homeInvoiceId}`,
      headers: buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role: "branch_admin",
        branchId: activeBranchId,
        permissions: "invoices:*",
      }),
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json().data.items.length, 0);
    assert.deepEqual(res.json().data.missing, [String(homeInvoiceId)]);
  });

  test("malformed ids returns 400 INVALID_PARAM", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/invoices/batch?ids=not-an-object-id",
      headers: platformHeaders(),
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json().code, "INVALID_PARAM");
  });

  test("over cap returns 400 INVALID_PARAM", async () => {
    const ids = Array.from({ length: MAX_BATCH_IDS + 1 }, (_, i) =>
      String(i).padStart(24, "0"),
    ).join(",");
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/batch?ids=${ids}`,
      headers: platformHeaders(),
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json().code, "INVALID_PARAM");
  });

  test("batch path is not treated as invoice id detail route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/invoices/batch?ids=665a3d76b1e5f8b9e6f2bfff",
      headers: platformHeaders(),
    });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json().data);
    assert.ok(Array.isArray(res.json().data.missing));
  });
});
