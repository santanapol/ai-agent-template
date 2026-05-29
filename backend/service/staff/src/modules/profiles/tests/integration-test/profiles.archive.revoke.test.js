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

function lifecycleMeshHeaders(overrides = {}) {
  const headers = buildMeshHeaders(overrides);
  delete headers["content-type"];
  return headers;
}

if (!RUN) {
  describe("archive revoke 503 (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("archive outbound revoke", () => {
    let app;
    let mockAuth;
    let otherProfileId;
    let otherUserId;
    let adminUserId;

    const testEnv = {
      appName: "staff-service",
      nodeEnv: "test",
      port: 3004,
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
        revokeBehavior: "fail",
      });
      testEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(testEnv);

      otherUserId = new ObjectId();
      adminUserId = new ObjectId().toString();
      const now = new Date();
      const users = getDatabase().collection(STAFF_COLLECTIONS.USERS);

      await users.deleteMany({ _id: otherUserId });
      await users.insertOne({
        _id: otherUserId,
        ou_id: toObjectId(ouId),
        branch_id: toObjectId(branchA1),
        username: `t14other.${Date.now()}@test.invalid`,
        password_hash: "test-hash-not-used",
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
          code: `T14-${Date.now()}`,
          firstname: "Revoke",
          lastname: "Fail",
          email: "revoke.fail@example.invalid",
          tel: "+66810000004",
        },
        { userId: staffUserId, ouId, branchId: branchA1 },
        "POST /api/v1/staff/profiles",
      );
      otherProfileId = created.profile.id;
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (otherProfileId) {
          await db
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteOne({ _id: toObjectId(otherProfileId) });
        }
        if (otherUserId) {
          await db
            .collection(STAFF_COLLECTIONS.USERS)
            .deleteOne({ _id: otherUserId });
        }
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        await closeDatabase();
      }
    });

    test("revoke fail after archive returns 503 STAFF_AUTH_REVOKE_PENDING and keeps archived", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${otherProfileId}`,
        headers: lifecycleMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
      });
      assert.strictEqual(getRes.statusCode, 200);

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/archive`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": getRes.headers.etag,
        },
      });

      assert.strictEqual(res.statusCode, 503, JSON.stringify(res.json()));
      assert.strictEqual(res.json().code, CODES.STAFF_AUTH_REVOKE_PENDING);

      const doc = await getDatabase()
        .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
        .findOne({ _id: toObjectId(otherProfileId) });
      assert.strictEqual(doc?.status, "archived");
    });
  });
}
