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
  port: 3101,
  dbName: initialEnv.dbName || "zero-platform",
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
  describe("profiles count (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("profiles count", () => {
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

      await getDatabase()
        .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
        .deleteMany({ ou_id: toObjectId(ouId) });

      const profiles = [
        {
          branchId: branchA1,
          userSuffix: "cnt-a1-active",
          code: `CNT-A1-${suffix}`,
          status: "active",
          username: `cnt.a1.active.${suffix}`,
        },
        {
          branchId: branchA2,
          userSuffix: "cnt-a2-active",
          code: `CNT-A2-${suffix}`,
          status: "active",
          username: `cnt.a2.active.${suffix}`,
        },
        {
          branchId: branchA1,
          userSuffix: "cnt-a1-arch",
          code: `CNT-ARC-${suffix}`,
          status: "archived",
          username: `cnt.a1.arch.${suffix}`,
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
            cr_prog: "profiles.count.test.js",
            upd_by: adminUserId,
            upd_date: now,
            upd_prog: "profiles.count.test.js",
          });

        const created = await insertProfile(
          {
            user_id: userId.toHexString(),
            code: item.code,
            firstname: item.userSuffix,
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

    test("platform_admin count active scopes to x-user-branch by default", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles/count?status=active",
        headers: buildMeshHeaders({
          role: "platform_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      const body = res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.total, 1);
    });

    test("platform_admin count archived in active branch", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles/count?status=archived",
        headers: buildMeshHeaders({
          role: "platform_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.total, 1);
    });

    test("platform_admin branch_id filter overrides active branch scope", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/count?status=active&branch_id=${branchA2}`,
        headers: buildMeshHeaders({
          role: "platform_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.total, 1);
    });

    test("branch_admin counts only pinned branch", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles/count?status=active",
        headers: buildMeshHeaders({
          role: "branch_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.total, 1);
    });

    test("branch_admin foreign branch_id returns 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/count?status=active&branch_id=${branchA2}`,
        headers: buildMeshHeaders({
          role: "branch_admin",
          branchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });

    test("staff count returns 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles/count?status=active",
        headers: buildMeshHeaders({ role: "staff", userId: adminUserId }),
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
    });

    test("missing status returns 400", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/staff/profiles/count",
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });
}
