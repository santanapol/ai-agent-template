import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import CODES from "../../../../lib/error-codes.js";
import { insertProfile, toObjectId } from "../../profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

const ouId = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const branchA2 = "507f1f77bcf86cd799439014";
const adminUserId = "507f1f77bcf86cd799439013";

const testEnv = {
  appName: "staff-service",
  nodeEnv: "test",
  port: 3004,
  dbName: initialEnv.dbName || "auth_login",
  mongoUri: initialEnv.mongoUri || "",
  gatewaySharedSecret: "test-gateway-secret-32-chars-minimum!!",
  authInternalBaseUrl: "http://127.0.0.1:3001",
  authInternalServiceSecret: "internal-secret",
  staffProvisionDefaultRole: "staff",
  shutdownTimeoutMs: 5000,
  bodyLimit: "1mb",
  maxPoolSize: 10,
  minPoolSize: 2,
  authRevokeMaxRetries: 3,
  authRevokeBackoffMs: 200,
};

if (!RUN) {
  describe("list profiles (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("list profiles", () => {
    let app;
    const createdProfileIds = [];
    const createdUserIds = [];
    const suffix = Date.now();

    const adminContext = {
      userId: adminUserId,
      ouId,
      branchId: branchA1,
    };

    before(async () => {
      await connectDatabase();
      app = await createApp(testEnv);

      const profiles = [
        {
          branchId: branchA1,
          userSuffix: "a1-active",
          code: `LST-A1-${suffix}`,
          status: "active",
          username: `lst.a1.active.${suffix}`,
        },
        {
          branchId: branchA2,
          userSuffix: "a2-active",
          code: `LST-A2-${suffix}`,
          status: "active",
          username: `lst.a2.active.${suffix}`,
        },
        {
          branchId: branchA1,
          userSuffix: "a1-arch",
          code: `LST-ARC-${suffix}`,
          status: "archived",
          username: `lst.a1.arch.${suffix}`,
        },
      ];

      for (const item of profiles) {
        const userId = new ObjectId();
        createdUserIds.push(userId);
        const now = new Date();
        await getDatabase()
          .collection(STAFF_COLLECTIONS.USERS)
          .insertOne({
            _id: userId,
            ou_id: toObjectId(ouId),
            branch_id: toObjectId(item.branchId),
            username: item.username,
            password_hash: "test-hash-not-used",
            role: "staff",
            cr_by: adminUserId,
            cr_date: now,
            cr_prog: "test.setup",
            upd_by: adminUserId,
            upd_date: now,
            upd_prog: "test.setup",
          });

        const created = await insertProfile(
          {
            user_id: userId.toString(),
            code: item.code,
            firstname: "List",
            lastname: item.userSuffix,
            email: `${item.userSuffix}@example.invalid`,
            tel: "+66810000099",
            status: item.status,
          },
          { ...adminContext, branchId: item.branchId },
          "POST /api/v1/staff/profiles",
        );
        createdProfileIds.push(created.profile.id);
      }
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (createdProfileIds.length > 0) {
          await db.collection(STAFF_COLLECTIONS.STAFF_PROFILES).deleteMany({
            _id: { $in: createdProfileIds.map((id) => toObjectId(id)) },
          });
        }
        if (createdUserIds.length > 0) {
          await db
            .collection(STAFF_COLLECTIONS.USERS)
            .deleteMany({ _id: { $in: createdUserIds } });
        }
        if (app) await app.close();
      } finally {
        await closeDatabase();
      }
    });

    test("platform_admin list returns array and pagination", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles?status=all",
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 200);
      const body = res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.ok(body.pagination.total >= 3);
      assert.ok(body.data.some((row) => row.code === `LST-A1-${suffix}`));
    });

    test("staff list returns 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "staff", userId: adminUserId }),
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });

    test("branch_admin only sees profiles in own branch", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles?status=all",
        headers: buildMeshHeaders({
          role: "branch_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      const codes = res.json().data.map((row) => row.code);
      assert.ok(codes.includes(`LST-A1-${suffix}`));
      assert.ok(codes.includes(`LST-ARC-${suffix}`));
      assert.ok(!codes.includes(`LST-A2-${suffix}`));
    });

    test("platform_admin status=archived lists archived across branches", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?status=archived&q=${suffix}`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 200);
      const body = res.json();
      assert.ok(body.data.length >= 1);
      assert.ok(body.data.every((row) => row.status === "archived"));
      assert.ok(body.data.some((row) => row.code === `LST-ARC-${suffix}`));
    });

    test("q search matches username via join", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?status=all&q=lst.a2.active.${suffix}`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 200);
      const body = res.json();
      assert.strictEqual(body.data.length, 1);
      assert.strictEqual(body.data[0].code, `LST-A2-${suffix}`);
      assert.strictEqual(body.data[0].user.username, `lst.a2.active.${suffix}`);
    });

    test("sort=code returns profiles sorted by code ascending", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?status=all&sort=code&q=${suffix}`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 200);
      const codes = res.json().data.map((row) => row.code);
      const sorted = [...codes].sort();
      assert.deepStrictEqual(codes, sorted);
    });
  });
}
