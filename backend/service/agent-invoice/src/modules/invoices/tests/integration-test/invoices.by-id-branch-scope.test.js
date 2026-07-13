import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import buildApp from "../../../../app.js";
import { buildEtag } from "../../../../lib/etag.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import { getInvoiceDatabase } from "../../../../config/database-invoice.js";

describe("Invoice by-id endpoints — branch scope (IDOR)", () => {
  let app;
  const ouId = "665a3d76b1e5f8b9e6f2b9b1";
  const homeBranchId = "665a3d76b1e5f8b9e6f2b9c1";
  const activeBranchId = "665a3d76b1e5f8b9e6f2b9d1";
  const mockUserId = "test_invoice_by_id_scope_user";
  const ivPrefix = `T-BYID-${Date.now()}`;
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
      cr_prog: "test/invoices.by-id-branch-scope",
      cr_date: now,
      upd_by: mockUserId,
      upd_prog: "test/invoices.by-id-branch-scope",
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
      status: "PENDING",
    });
    homeInvoiceId = home.insertedId;
    activeInvoiceId = active.insertedId;

    await db.collection("agents").updateOne(
      {
        ou_id: new ObjectId(ouId),
        branch_id: new ObjectId(activeBranchId),
      },
      {
        $set: {
          ou_id: new ObjectId(ouId),
          branch_id: new ObjectId(activeBranchId),
          currency: "thb",
          upd_date: now,
        },
        $setOnInsert: {
          cr_by: mockUserId,
          cr_date: now,
          cr_prog: "test/invoices.by-id-branch-scope",
        },
      },
      { upsert: true },
    );
  });

  after(async () => {
    try {
      await cleanupInvoices();
    } finally {
      if (app) await app.close();
    }
  });

  const pinnedRoles = ["branch_admin", "staff"];

  for (const role of pinnedRoles) {
    const headers = () =>
      buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role,
        branchId: activeBranchId,
        permissions: "invoices:*",
      });

    test(`${role} cannot read invoice detail from another branch`, async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/invoices/${homeInvoiceId}`,
        headers: headers(),
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, "RESOURCE_NOT_FOUND");
    });

    test(`${role} cannot list transactions for invoice in another branch`, async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/invoices/${homeInvoiceId}/transactions`,
        headers: headers(),
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, "RESOURCE_NOT_FOUND");
    });

    test(`${role} cannot update status for invoice in another branch`, async () => {
      const res = await app.inject({
        method: "PUT",
        url: `/api/v1/invoices/${homeInvoiceId}/status`,
        headers: {
          ...headers(),
          "if-match": buildEtag(now),
        },
        payload: { status: "PAID" },
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, "RESOURCE_NOT_FOUND");
    });

    test(`${role} cannot calculate fee for invoice in another branch`, async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/invoices/calculate-fee",
        headers: {
          ...headers(),
          "if-match": buildEtag(now),
        },
        payload: { iv_id: String(homeInvoiceId), action: "CALCULATE" },
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, "RESOURCE_NOT_FOUND");
    });

    test(`${role} can read own-branch invoice detail`, async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/invoices/${activeInvoiceId}`,
        headers: headers(),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.iv_no, `${ivPrefix}-ACTIVE`);
      assert.strictEqual(res.json().data.currency, "THB");
    });
  }

  test("branch_admin generate ignores cross-branch branch_id in body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/invoices/generate",
      headers: buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role: "branch_admin",
        branchId: activeBranchId,
        permissions: "invoices:*",
      }),
      payload: {
        month: "2099-12",
        branch_id: homeBranchId,
      },
    });

    // Controller forces active branch; other-branch id must not unlock OU-wide generate.
    assert.notStrictEqual(res.statusCode, 200);
    const body = res.json();
    assert.ok(
      body.code === "INVALID_PARAM" ||
        body.code === "RESOURCE_NOT_FOUND" ||
        body.code === "PARTIAL_FAILURE" ||
        body.code === "INTERNAL_ERROR",
      `unexpected success path: ${body.code}`,
    );

    const db = getInvoiceDatabase();
    const crossBranchCreated = await db.collection("agent_iv").countDocuments({
      branch_id: new ObjectId(homeBranchId),
      cr_prog: "invoices/generate",
      billing_month: "2099-12",
    });
    assert.strictEqual(crossBranchCreated, 0);
  });
});
