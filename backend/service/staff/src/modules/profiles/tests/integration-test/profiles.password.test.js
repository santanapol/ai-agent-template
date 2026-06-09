import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { resetAuthInternalClientForTests } from "../../../../lib/clients/auth-internal.client.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import { startMockAuthInternalServer } from "../../../../lib/test-helpers/mock-auth-internal-server.js";
import CODES from "../../../../lib/error-codes.js";
import { insertProfile, toObjectId } from "../../profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

const ouId = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const staffUserId = "507f1f77bcf86cd799439013";

if (!RUN) {
  describe("admin password reset (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("POST profile password reset", () => {
    let app;
    let mockAuth;
    let adminProfileId;
    let otherProfileId;
    let adminUserId;

    const testEnv = {
      appName: "staff-service",
      nodeEnv: "test",
      port: 3101,
      dbName: initialEnv.dbName || "auth_login",
      mongoUri: initialEnv.mongoUri || "",
      gatewaySharedSecret: "test-gateway-secret-32-chars-minimum!!",
      authInternalServiceSecret: "internal-secret",
      staffProvisionDefaultRole: "staff",
      shutdownTimeoutMs: 5000,
      bodyLimit: "1mb",
      maxPoolSize: 10,
      minPoolSize: 2,
      authRevokeMaxRetries: 3,
      authRevokeBackoffMs: 200,
    };

    before(async () => {
      await connectDatabase();
      mockAuth = await startMockAuthInternalServer({
        getDatabase,
        serviceSecret: testEnv.authInternalServiceSecret,
        actorUserId: staffUserId,
        passwordBehavior: "success",
      });
      testEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(testEnv);

      const otherUserId = new ObjectId();
      const adminUserObjectId = new ObjectId();
      adminUserId = adminUserObjectId.toString();
      const now = new Date();

      const users = getDatabase().collection(STAFF_COLLECTIONS.USERS);
      await users.deleteMany({
        _id: { $in: [otherUserId, adminUserObjectId] },
      });
      await users.insertMany([
        {
          _id: otherUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `t15other.${Date.now()}@test.invalid`,
          password_hash: "test-hash-not-used",
          role: "staff",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test.setup",
        },
        {
          _id: adminUserObjectId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `t15admin.${Date.now()}@test.invalid`,
          password_hash: "test-hash-not-used",
          role: "platform_admin",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test.setup",
        },
      ]);

      const adminCreated = await insertProfile(
        {
          user_id: adminUserId,
          code: `T15-ADM-${Date.now()}`,
          firstname: "Admin",
          lastname: "Self",
          email: "admin.self@example.invalid",
          tel: "+66810000005",
        },
        { userId: adminUserId, ouId, branchId: branchA1 },
        "POST /api/v1/staff/profiles",
      );
      adminProfileId = adminCreated.profile.id;

      const otherCreated = await insertProfile(
        {
          user_id: otherUserId.toString(),
          code: `T15-OTH-${Date.now()}`,
          firstname: "Other",
          lastname: "User",
          email: "other.user@example.invalid",
          tel: "+66810000006",
        },
        { userId: staffUserId, ouId, branchId: branchA1 },
        "POST /api/v1/staff/profiles",
      );
      otherProfileId = otherCreated.profile.id;
    });

    after(async () => {
      try {
        const db = getDatabase();
        for (const id of [adminProfileId, otherProfileId]) {
          if (id) {
            await db
              .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
              .deleteOne({ _id: toObjectId(id) });
          }
        }
        await db.collection(STAFF_COLLECTIONS.USERS).deleteMany({
          username: { $regex: /^t15(other|admin)\./ },
        });
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        await closeDatabase();
      }
    });

    test("admin reset other profile password returns 204 empty body", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/password`,
        headers: buildMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
        payload: {
          password: "NewSecurePass1234!",
        },
      });

      assert.strictEqual(res.statusCode, 204);
      assert.strictEqual(res.body, "");

      const last = mockAuth.getLastPasswordRequest();
      assert.strictEqual(last?.password, "NewSecurePass1234!");
      assert.strictEqual(last?.revoke_sessions, true);
    });

    test("admin cannot reset own profile password", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${adminProfileId}/password`,
        headers: buildMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
        payload: {
          password: "NewSecurePass1234!",
        },
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });

    test("missing profile returns 404", async () => {
      const missingId = new ObjectId().toString();
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${missingId}/password`,
        headers: buildMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
        payload: {
          password: "NewSecurePass1234!",
        },
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, CODES.RESOURCE_NOT_FOUND);
    });
  });

  describe("POST profile password when auth is down", () => {
    let app;
    let mockAuth;
    let otherProfileId;

    const testEnv = {
      appName: "staff-service",
      nodeEnv: "test",
      port: 3101,
      dbName: initialEnv.dbName || "auth_login",
      mongoUri: initialEnv.mongoUri || "",
      gatewaySharedSecret: "test-gateway-secret-32-chars-minimum!!",
      authInternalServiceSecret: "internal-secret",
      staffProvisionDefaultRole: "staff",
      shutdownTimeoutMs: 5000,
      bodyLimit: "1mb",
      maxPoolSize: 10,
      minPoolSize: 2,
      authRevokeMaxRetries: 2,
      authRevokeBackoffMs: 1,
    };

    before(async () => {
      await connectDatabase();
      mockAuth = await startMockAuthInternalServer({
        getDatabase,
        serviceSecret: testEnv.authInternalServiceSecret,
        actorUserId: staffUserId,
        passwordBehavior: "fail",
      });
      testEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(testEnv);

      const otherUserId = new ObjectId();
      const now = new Date();
      await getDatabase()
        .collection(STAFF_COLLECTIONS.USERS)
        .insertOne({
          _id: otherUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `t15fail.${Date.now()}@test.invalid`,
          password_hash: "x",
          role: "staff",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test.setup",
        });

      const created = await insertProfile(
        {
          user_id: otherUserId.toString(),
          code: `T15-FAIL-${Date.now()}`,
          firstname: "Fail",
          lastname: "Auth",
          email: "fail.auth@example.invalid",
          tel: "+66810000007",
        },
        { userId: staffUserId, ouId, branchId: branchA1 },
        "POST /api/v1/staff/profiles",
      );
      otherProfileId = created.profile.id;
    });

    after(async () => {
      try {
        if (otherProfileId) {
          await getDatabase()
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteOne({ _id: toObjectId(otherProfileId) });
        }
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        await closeDatabase();
      }
    });

    test("auth password failure returns 503 SERVICE_UNAVAILABLE", async () => {
      const adminUserId = new ObjectId().toString();
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/password`,
        headers: buildMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
        payload: {
          password: "NewSecurePass1234!",
        },
      });

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.json().code, CODES.SERVICE_UNAVAILABLE);
    });
  });
}
