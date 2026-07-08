import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import CODES from "../../../../lib/error-codes.js";
import { toObjectId } from "../../profiles.repository.js";
import { setRuntimeEnv } from "../../../../config/runtime-env.js";
import { resetAuthInternalClientForTests } from "../../../../lib/clients/auth-internal.client.js";
import { startMockAuthInternalServer } from "../../../../lib/test-helpers/mock-auth-internal-server.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

const ouId = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const staffUserId = "507f1f77bcf86cd799439013";

const baseTestEnv = {
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
  permissionMode: "dual",
};

if (!RUN) {
  describe("Profiles Permissions Integration (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("Profiles Permissions Integration", () => {
    let app;
    let mockAuth;
    const suffix = Date.now();
    const createdUserIds = [];
    const createdProfileIds = [];

    before(async () => {
      await connectDatabase();
      mockAuth = await startMockAuthInternalServer({
        getDatabase,
        serviceSecret: baseTestEnv.authInternalServiceSecret,
        defaultRole: baseTestEnv.staffProvisionDefaultRole,
        actorUserId: staffUserId,
        revokeBehavior: "success",
      });
      baseTestEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp({ ...baseTestEnv });
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (createdProfileIds.length > 0) {
          await db
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteMany({ _id: { $in: createdProfileIds } });
        }
        if (createdUserIds.length > 0) {
          await db
            .collection(STAFF_COLLECTIONS.USERS)
            .deleteMany({ _id: { $in: createdUserIds } });
        }
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        await closeDatabase();
      }
    });

    describe("Dual Mode (Default)", () => {
      before(() => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "dual" });
      });

      test("Dual mode: succeeds without permission header but with admin role", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "platform_admin",
          }),
        });

        assert.strictEqual(res.statusCode, 200);
      });

      test("Dual mode: fails with 403 PERMISSION_DENIED without permission header and non-admin role", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "staff",
          }),
        });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
      });
    });

    describe("Enforce Mode", () => {
      before(() => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });
      });

      after(() => {
        // Reset back to dual
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "dual" });
      });

      test("Enforce mode: succeeds with profiles:list permission", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: { "x-user-permissions": "profiles:list" },
          }),
        });

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.json().success, true);
      });

      test("Enforce mode: succeeds with profiles:* wildcard permission", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: { "x-user-permissions": "profiles:*" },
          }),
        });

        assert.strictEqual(res.statusCode, 200);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED when permission mismatch", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "roles:assign" },
          }),
        });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED when no permission header is sent", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "platform_admin",
          }),
        });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
      });
    });

    describe("Create Profile (POST /api/v1/staff/profiles)", () => {
      let targetUserId;
      let targetUserId2;
      const now = new Date();

      before(async () => {
        const db = getDatabase();
        targetUserId = new ObjectId();
        createdUserIds.push(targetUserId);
        await db.collection(STAFF_COLLECTIONS.USERS).insertOne({
          _id: targetUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `permcreate1.${suffix}@test.invalid`,
          password_hash: "hash",
          role: "staff",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test",
        });

        targetUserId2 = new ObjectId();
        createdUserIds.push(targetUserId2);
        await db.collection(STAFF_COLLECTIONS.USERS).insertOne({
          _id: targetUserId2,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `permcreate2.${suffix}@test.invalid`,
          password_hash: "hash",
          role: "staff",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test",
        });
      });

      test("Enforce mode: succeeds with profiles:create permission", async () => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const res = await app.inject({
          method: "POST",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: { "x-user-permissions": "profiles:create" },
          }),
          payload: {
            user_id: targetUserId.toString(),
            code: `P-C1-${suffix}`,
            firstname: "Perm",
            lastname: "Create1",
            email: `p1.${suffix}@test.invalid`,
            tel: "+66810000091",
          },
        });

        assert.strictEqual(res.statusCode, 201);
        const body = res.json();
        assert.strictEqual(body.success, true);
        if (body.data?.id) {
          createdProfileIds.push(toObjectId(body.data.id));
        }
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED when permission missing", async () => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const res = await app.inject({
          method: "POST",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
          payload: {
            user_id: targetUserId2.toString(),
            code: `P-C2-${suffix}`,
            firstname: "Perm",
            lastname: "Create2",
            email: `p2.${suffix}@test.invalid`,
            tel: "+66810000092",
          },
        });

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
      });

      test("Dual mode: succeeds with admin role and no permissions", async () => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "dual" });

        const res = await app.inject({
          method: "POST",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "platform_admin",
          }),
          payload: {
            user_id: targetUserId2.toString(),
            code: `P-C2-${suffix}`,
            firstname: "Perm",
            lastname: "Create2",
            email: `p2.${suffix}@test.invalid`,
            tel: "+66810000092",
          },
        });

        assert.strictEqual(res.statusCode, 201);
        const body = res.json();
        if (body.data?.id) {
          createdProfileIds.push(toObjectId(body.data.id));
        }
      });

      test("Enforce mode: provision with non-default role requires roles:assign", async () => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const denied = await app.inject({
          method: "POST",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "branch_admin",
            extraHeaders: { "x-user-permissions": "profiles:create" },
          }),
          payload: {
            code: `P-C3-${suffix}`,
            firstname: "Role",
            lastname: "Denied",
            email: `p3.${suffix}@test.invalid`,
            tel: "+66810000093",
            username: `p3.${suffix}`,
            password: "ChangeMe!1",
            role: "support",
          },
        });

        assert.strictEqual(denied.statusCode, 403);
        assert.strictEqual(denied.json().code, CODES.PERMISSION_DENIED);
      });

      test("Enforce mode: provision with non-default role succeeds with roles:assign", async () => {
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const res = await app.inject({
          method: "POST",
          url: "/api/v1/staff/profiles",
          headers: buildMeshHeaders({
            role: "branch_admin",
            extraHeaders: {
              "x-user-permissions": "profiles:create,roles:assign",
            },
          }),
          payload: {
            code: `P-C4-${suffix}`,
            firstname: "Role",
            lastname: "Allowed",
            email: `p4.${suffix}@test.invalid`,
            tel: "+66810000094",
            username: `p4.${suffix}`,
            password: "ChangeMe!1",
            role: "support",
          },
        });

        assert.strictEqual(res.statusCode, 201);
        const body = res.json();
        if (body.data?.id) {
          createdProfileIds.push(toObjectId(body.data.id));
        }
      });
    });

    describe("Archive Profile (POST /api/v1/staff/profiles/:id/archive)", () => {
      let targetProfileId;

      before(async () => {
        if (createdProfileIds.length > 0) {
          targetProfileId = createdProfileIds[0];
        }
      });

      test("Enforce mode: succeeds with profiles:edit permission", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        // First need to get the if-match header
        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/archive`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:edit",
              "if-match": etag,
            },
          }),
          payload: {},
        });

        assert.strictEqual(res.statusCode, 200);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED without profiles:edit", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        // Fetch a valid etag first so parseIfMatchHeader succeeds and we reach the permission check
        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/archive`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:read", // missing profiles:edit
              "if-match": etag,
            },
          }),
          payload: {},
        });

        assert.strictEqual(res.statusCode, 403);
      });
    });

    describe("Restore Profile (POST /api/v1/staff/profiles/:id/restore)", () => {
      let targetProfileId;

      before(async () => {
        if (createdProfileIds.length > 0) {
          targetProfileId = createdProfileIds[0];
        }
      });

      test("Enforce mode: succeeds with profiles:edit permission", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/restore`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:edit",
              "if-match": etag,
            },
          }),
          payload: {},
        });

        assert.strictEqual(res.statusCode, 200);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED without profiles:edit", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/restore`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:read", // missing profiles:edit
              "if-match": etag,
            },
          }),
          payload: {},
        });

        assert.strictEqual(res.statusCode, 403);
      });
    });

    describe("Reset Password (POST /api/v1/staff/profiles/:id/reset-password)", () => {
      let targetProfileId;

      before(async () => {
        if (createdProfileIds.length > 0) {
          targetProfileId = createdProfileIds[0];
        }
      });

      test("Enforce mode: succeeds with profiles:edit permission", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/password`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:edit",
              "if-match": etag,
            },
          }),
          payload: {
            password: "NewPassword123!",
          },
        });

        assert.strictEqual(res.statusCode, 204);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED without profiles:edit", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "POST",
          url: `/api/v1/staff/profiles/${targetProfileId}/password`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:read", // missing profiles:edit
              "if-match": etag,
            },
          }),
          payload: {
            password: "NewPassword123!",
          },
        });

        assert.strictEqual(res.statusCode, 403);
      });
    });

    describe("Update Role (PATCH /api/v1/staff/profiles/:id/role)", () => {
      let targetProfileId;

      before(async () => {
        if (createdProfileIds.length > 0) {
          targetProfileId = createdProfileIds[0];
        }
      });

      test("Enforce mode: succeeds with roles:assign permission", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "PATCH",
          url: `/api/v1/staff/profiles/${targetProfileId}/role`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "roles:assign",
              "if-match": etag,
            },
          }),
          payload: {
            role: "support",
          },
        });

        assert.strictEqual(res.statusCode, 204);
      });

      test("Enforce mode: fails with 403 PERMISSION_DENIED without roles:assign", async () => {
        if (!targetProfileId) return;
        setRuntimeEnv({ ...baseTestEnv, permissionMode: "enforce" });

        const getRes = await app.inject({
          method: "GET",
          url: `/api/v1/staff/profiles/${targetProfileId}`,
          headers: buildMeshHeaders({
            role: "platform_admin",
            extraHeaders: { "x-user-permissions": "profiles:read" },
          }),
        });
        const etag = getRes.headers.etag;

        const res = await app.inject({
          method: "PATCH",
          url: `/api/v1/staff/profiles/${targetProfileId}/role`,
          headers: buildMeshHeaders({
            role: "staff",
            extraHeaders: {
              "x-user-permissions": "profiles:read", // missing roles:assign
              "if-match": etag,
            },
          }),
          payload: {
            role: "support",
          },
        });

        assert.strictEqual(res.statusCode, 403);
      });
    });
  });
}
