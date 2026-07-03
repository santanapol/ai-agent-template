import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import buildApp from "../../../../app.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import { getInvoiceDatabase } from "../../../../config/database-invoice.js";

describe("GET /api/v1/invoices — active branch scoping (AC-7)", () => {
  let app;
  const ouId = "665a3d76b1e5f8b9e6f2b9b1";
  const homeBranchId = "665a3d76b1e5f8b9e6f2b9c1";
  const activeBranchId = "665a3d76b1e5f8b9e6f2b9d1";
  const mockUserId = "test_invoice_branch_scope_user";
  const ivPrefix = `T-BR-SCOPE-${Date.now()}`;

  /** @type {import('mongodb').ObjectId[]} */
  const insertedIds = [];

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
    const now = new Date();
    const base = {
      ou_id: new ObjectId(ouId),
      billing_month: "2026-01",
      due_date: now,
      net_win: 0,
      bet: 0,
      amount: 100,
      status: "draft",
      cr_by: mockUserId,
      cr_prog: "test/invoices.list-branch-scope",
      cr_date: now,
      upd_by: mockUserId,
      upd_prog: "test/invoices.list-branch-scope",
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
    insertedIds.push(home.insertedId, active.insertedId);
  });

  after(async () => {
    try {
      await cleanupInvoices();
    } finally {
      if (app) await app.close();
    }
  });

  test("without branch_id query uses x-user-branch (active branch)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/invoices?page=1&limit=50",
      headers: buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role: "platform_admin",
        branchId: activeBranchId,
        permissions: "invoices:*",
      }),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.items));

    const scoped = body.data.items.filter((row) =>
      String(row.iv_no).startsWith(ivPrefix),
    );
    assert.strictEqual(scoped.length, 1);
    assert.strictEqual(scoped[0].branch_id, activeBranchId);
    assert.strictEqual(scoped[0].iv_no, `${ivPrefix}-ACTIVE`);
  });

  test("branch_id=all returns invoices across branches", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/invoices?page=1&limit=50&branch_id=all",
      headers: buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role: "platform_admin",
        branchId: activeBranchId,
        permissions: "invoices:*",
      }),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    const scoped = body.data.items.filter((row) =>
      String(row.iv_no).startsWith(ivPrefix),
    );
    assert.strictEqual(scoped.length, 2);
  });

  test("explicit branch_id query overrides x-user-branch", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/invoices?page=1&limit=50&branch_id=${homeBranchId}`,
      headers: buildMeshHeaders({
        ouId,
        userId: mockUserId,
        role: "platform_admin",
        branchId: activeBranchId,
        permissions: "invoices:*",
      }),
    });

    assert.strictEqual(res.statusCode, 200);
    const body = res.json();
    const scoped = body.data.items.filter((row) =>
      String(row.iv_no).startsWith(ivPrefix),
    );
    assert.strictEqual(scoped.length, 1);
    assert.strictEqual(scoped[0].branch_id, homeBranchId);
    assert.strictEqual(scoped[0].iv_no, `${ivPrefix}-HOME`);
  });

  // Branch-pinned roles must never escape their active branch, regardless of the
  // branch_id they send (SECURITY: prevents cross-branch invoice disclosure).
  for (const role of ["branch_admin", "staff"]) {
    test(`${role} cannot escape own branch via branch_id=all`, async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/invoices?page=1&limit=50&branch_id=all",
        headers: buildMeshHeaders({
          ouId,
          userId: mockUserId,
          role,
          branchId: activeBranchId,
          permissions: "invoices:*",
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      const scoped = res
        .json()
        .data.items.filter((row) => String(row.iv_no).startsWith(ivPrefix));
      assert.strictEqual(scoped.length, 1);
      assert.strictEqual(scoped[0].branch_id, activeBranchId);
      assert.strictEqual(scoped[0].iv_no, `${ivPrefix}-ACTIVE`);
    });

    test(`${role} cannot read another branch via explicit branch_id`, async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/invoices?page=1&limit=50&branch_id=${homeBranchId}`,
        headers: buildMeshHeaders({
          ouId,
          userId: mockUserId,
          role,
          branchId: activeBranchId,
          permissions: "invoices:*",
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      const scoped = res
        .json()
        .data.items.filter((row) => String(row.iv_no).startsWith(ivPrefix));
      assert.strictEqual(scoped.length, 1);
      // Coerced back to the caller's active branch, not the requested branch.
      assert.strictEqual(scoped[0].branch_id, activeBranchId);
      assert.strictEqual(scoped[0].iv_no, `${ivPrefix}-ACTIVE`);
    });
  }
});
