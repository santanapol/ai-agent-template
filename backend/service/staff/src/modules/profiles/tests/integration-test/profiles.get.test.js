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
const staffUserId = "507f1f77bcf86cd799439013";

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
  describe("GET profile / lookup (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("GET profile by id and lookup", () => {
    let app;
    let staffProfileId;
    let otherProfileId;
    let otherUserId;
    const codeStaff = `T08-staff-${Date.now()}`;
    const codeOther = `T08-other-${Date.now()}`;

    const userContext = {
      userId: staffUserId,
      ouId,
      branchId: branchA1,
    };

    before(async () => {
      await connectDatabase();
      app = await createApp(testEnv);

      otherUserId = new ObjectId();
      const now = new Date();
      await getDatabase()
        .collection(STAFF_COLLECTIONS.USERS)
        .insertOne({
          _id: otherUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `t08other.${Date.now()}@test.invalid`,
          password_hash: "test-hash-not-used",
          role: "staff",
          access_token_gen: 0,
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test.setup",
        });

      const staffCreated = await insertProfile(
        {
          user_id: staffUserId,
          code: codeStaff,
          firstname: "Staff",
          lastname: "Self",
          email: "staff.self@example.invalid",
          tel: "+66810000001",
        },
        userContext,
        "POST /api/v1/staff/profiles",
      );
      staffProfileId = staffCreated.profile.id;

      const otherCreated = await insertProfile(
        {
          user_id: otherUserId.toString(),
          code: codeOther,
          firstname: "Other",
          lastname: "User",
          email: "other.user@example.invalid",
          tel: "+66810000002",
        },
        { ...userContext, userId: staffUserId },
        "POST /api/v1/staff/profiles",
      );
      otherProfileId = otherCreated.profile.id;
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (staffProfileId) {
          await db
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteOne({ _id: toObjectId(staffProfileId) });
        }
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
        if (app) await app.close();
      } finally {
        await closeDatabase();
      }
    });

    test("GET /profiles/{id} returns profile with ETag", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers.etag);
      const body = res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.code, CODES.SUCCESS);
      assert.strictEqual(body.data.id, staffProfileId);
      assert.strictEqual(body.pagination, undefined);
    });

    test("GET /profiles?user_id= lookup returns single object without pagination", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?user_id=${staffUserId}`,
        headers: buildMeshHeaders({ role: "staff", userId: staffUserId }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers.etag);
      const body = res.json();
      assert.strictEqual(body.data.user_id, staffUserId);
      assert.strictEqual(body.pagination, undefined);
    });

    test("GET /profiles?user_id= with page returns 400 INVALID_PARAM", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?user_id=${staffUserId}&page=1`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.json().code, CODES.INVALID_PARAM);
    });

    test("staff lookup own user_id succeeds within ou/branch", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?user_id=${staffUserId}`,
        headers: buildMeshHeaders({ role: "staff", userId: staffUserId }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.id, staffProfileId);
    });

    test("platform_admin self lookup uses home branch when active differs (AC-6)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?user_id=${staffUserId}`,
        headers: buildMeshHeaders({
          role: "platform_admin",
          userId: staffUserId,
          branchId: branchA2,
          homeBranchId: branchA1,
        }),
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json().data.id, staffProfileId);
    });

    test("staff lookup another user_id returns 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles?user_id=${otherUserId.toString()}`,
        headers: buildMeshHeaders({ role: "staff", userId: staffUserId }),
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
    });

    test("staff GET /profiles/{id} for another profile returns 403", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${otherProfileId}`,
        headers: buildMeshHeaders({ role: "staff", userId: staffUserId }),
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.PERMISSION_DENIED);
    });

    test("GET /profiles/{id} unknown returns 404", async () => {
      const missingId = new ObjectId().toString();
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${missingId}`,
        headers: buildMeshHeaders({ role: "platform_admin" }),
      });

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.json().code, CODES.RESOURCE_NOT_FOUND);
    });
  });
}
