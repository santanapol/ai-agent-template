import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../../../lib/audit/audit-events.js";
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

const testEnv = {
  appName: "staff-service",
  nodeEnv: "test",
  port: 3101,
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
  describe("archive and restore profile (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("archive and restore profile", () => {
    let app;
    let mockAuth;
    let adminProfileId;
    let adminUserId;
    let otherProfileId;
    const codeAdmin = `T13-admin-${Date.now()}`;
    const codeOther = `T13-other-${Date.now()}`;

    const staffContext = {
      userId: staffUserId,
      ouId,
      branchId: branchA1,
    };

    before(async () => {
      await connectDatabase();
      mockAuth = await startMockAuthInternalServer({
        getDatabase,
        serviceSecret: testEnv.authInternalServiceSecret,
        defaultRole: testEnv.staffProvisionDefaultRole,
        actorUserId: staffUserId,
        revokeBehavior: "success",
      });
      testEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(testEnv);

      const otherUserId = new ObjectId();
      const adminUserObjectId = new ObjectId();
      adminUserId = adminUserObjectId.toString();
      const now = new Date();
      const users = getDatabase().collection(STAFF_COLLECTIONS.USERS);
      const userDoc = (id, username, role) => ({
        _id: id,
        ou_id: toObjectId(ouId),
        branch_id: toObjectId(branchA1),
        username,
        password_hash: "test-hash-not-used",
        role,
        cr_by: staffUserId,
        cr_date: now,
        cr_prog: "test.setup",
        upd_by: staffUserId,
        upd_date: now,
        upd_prog: "test.setup",
      });

      await users.deleteMany({
        _id: { $in: [otherUserId, adminUserObjectId] },
      });
      await users.insertOne(
        userDoc(otherUserId, `t13other.${Date.now()}@test.invalid`, "staff"),
      );
      await users.insertOne(
        userDoc(
          adminUserObjectId,
          `t13admin.${Date.now()}@test.invalid`,
          "platform_admin",
        ),
      );

      const adminCreated = await insertProfile(
        {
          user_id: adminUserId,
          code: codeAdmin,
          firstname: "Admin",
          lastname: "Self",
          email: "admin.self@example.invalid",
          tel: "+66810000003",
        },
        { ...staffContext, userId: adminUserId },
        "POST /api/v1/staff/profiles",
      );
      adminProfileId = adminCreated.profile.id;

      const otherCreated = await insertProfile(
        {
          user_id: otherUserId.toString(),
          code: codeOther,
          firstname: "Other",
          lastname: "User",
          email: "other.user@example.invalid",
          tel: "+66810000002",
        },
        { ...staffContext, userId: adminUserId },
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
          username: { $regex: /^t13(other|admin)\./ },
        });
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        await closeDatabase();
      }
    });

    async function fetchEtag(profileId, headers) {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${profileId}`,
        headers,
      });
      assert.strictEqual(res.statusCode, 200);
      return res.headers.etag;
    }

    test("admin archive transitions active to archived with audit", async () => {
      const etag = await fetchEtag(
        otherProfileId,
        lifecycleMeshHeaders({ userId: adminUserId, role: "platform_admin" }),
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/archive`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": etag,
        },
      });

      assert.strictEqual(res.statusCode, 200, JSON.stringify(res.json()));
      assert.strictEqual(res.json().data.status, "archived");
      assert.ok(res.headers.etag);

      const audit = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({
          event_type: STAFF_AUDIT_EVENT_TYPES.PROFILE_ARCHIVE,
          profile_id: toObjectId(otherProfileId),
        });
      assert.ok(audit);
    });

    test("admin restore transitions archived to active with audit", async () => {
      const etag = await fetchEtag(
        otherProfileId,
        lifecycleMeshHeaders({ userId: adminUserId, role: "platform_admin" }),
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/restore`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": etag,
        },
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.status, "active");

      const audit = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({
          event_type: STAFF_AUDIT_EVENT_TYPES.PROFILE_RESTORE,
          profile_id: toObjectId(otherProfileId),
        });
      assert.ok(audit);
    });

    test("staff role archive returns 403 INVALID_USER_CONTEXT", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/archive`,
        headers: {
          ...lifecycleMeshHeaders({ userId: staffUserId, role: "staff" }),
          "if-match": 'W/"dGVzdC1ldGFn"',
        },
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });

    test("archive requires If-Match and returns 428", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/archive`,
        headers: lifecycleMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
      });

      assert.strictEqual(res.statusCode, 428);
      assert.strictEqual(res.json().code, CODES.PRECONDITION_REQUIRED);
    });

    test("restore with invalid If-Match returns 412", async () => {
      const archiveEtag = await fetchEtag(
        otherProfileId,
        lifecycleMeshHeaders({ userId: adminUserId, role: "platform_admin" }),
      );

      const archiveRes = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/archive`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": archiveEtag,
        },
      });
      assert.strictEqual(archiveRes.statusCode, 200);

      const restoreRes = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${otherProfileId}/restore`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": "invalid-etag",
        },
      });

      assert.strictEqual(restoreRes.statusCode, 412);
      assert.strictEqual(restoreRes.json().code, CODES.VERSION_CONFLICT);
    });

    test("admin cannot archive own profile", async () => {
      const etag = await fetchEtag(
        adminProfileId,
        lifecycleMeshHeaders({ userId: adminUserId, role: "platform_admin" }),
      );

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${adminProfileId}/archive`,
        headers: {
          ...lifecycleMeshHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": etag,
        },
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });
  });
}
