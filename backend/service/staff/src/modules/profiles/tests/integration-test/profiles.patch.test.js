import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../../../lib/audit/audit-events.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import CODES from "../../../../lib/error-codes.js";
import { insertProfile, toObjectId } from "../../profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

const ouId = "507f1f77bcf86cd799439011";
const branchA1 = "507f1f77bcf86cd799439012";
const staffUserId = "507f1f77bcf86cd799439013";
const adminUserId = "507f1f77bcf86cd799439015";

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

function patchHeaders(overrides = {}) {
  return {
    ...buildMeshHeaders(overrides),
    "content-type": "application/merge-patch+json",
  };
}

if (!RUN) {
  describe("PATCH profile (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("PATCH profile", () => {
    let app;
    let staffProfileId;
    let otherProfileId;
    let staffEtag;
    const codeStaff = `T12-staff-${Date.now()}`;
    const codeOther = `T12-other-${Date.now()}`;

    const staffContext = {
      userId: staffUserId,
      ouId,
      branchId: branchA1,
    };

    before(async () => {
      await connectDatabase();
      app = await createApp(testEnv);

      const staffCreated = await insertProfile(
        {
          user_id: staffUserId,
          code: codeStaff,
          firstname: "Staff",
          lastname: "Self",
          email: "staff.self@example.invalid",
          tel: "+66810000001",
        },
        staffContext,
        "POST /api/v1/staff/profiles",
      );
      staffProfileId = staffCreated.profile.id;
      staffEtag = staffCreated.etag;

      const otherUserId = new ObjectId();
      const now = new Date();
      await getDatabase()
        .collection(STAFF_COLLECTIONS.USERS)
        .insertOne({
          _id: otherUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchA1),
          username: `t12other.${Date.now()}@test.invalid`,
          password_hash: "test-hash-not-used",
          role: "staff",
          cr_by: staffUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: staffUserId,
          upd_date: now,
          upd_prog: "test.setup",
        });

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
      } finally {
        await app?.close();
        await closeDatabase();
      }
    });

    test("missing If-Match returns 428 PRECONDITION_REQUIRED", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: patchHeaders({ userId: staffUserId, role: "staff" }),
        payload: { firstname: "Updated" },
      });

      assert.strictEqual(res.statusCode, 428);
      assert.strictEqual(res.json().code, CODES.PRECONDITION_REQUIRED);
    });

    test("stale If-Match returns 412 VERSION_CONFLICT", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/staff/profiles/${otherProfileId}`,
        headers: {
          ...patchHeaders({ userId: adminUserId, role: "platform_admin" }),
          "if-match": staffEtag,
        },
        payload: { firstname: "Stale" },
      });

      assert.strictEqual(res.statusCode, 412);
      assert.strictEqual(res.json().code, CODES.VERSION_CONFLICT);
    });

    test("admin PATCH updates fields email lowercase and returns new ETag", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${otherProfileId}`,
        headers: buildMeshHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
      });
      assert.strictEqual(getRes.statusCode, 200);
      const etag = getRes.headers.etag;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/staff/profiles/${otherProfileId}`,
        headers: {
          ...patchHeaders({ userId: adminUserId, role: "platform_admin" }),
          "if-match": etag,
        },
        payload: {
          firstname: "Patched",
          email: "  Patched.Admin@Example.COM ",
        },
      });

      assert.strictEqual(res.statusCode, 200, JSON.stringify(res.json()));
      const body = res.json();
      assert.strictEqual(body.code, CODES.SUCCESS);
      assert.strictEqual(body.data.firstname, "Patched");
      assert.strictEqual(body.data.email, "patched.admin@example.com");
      assert.ok(res.headers.etag);
      assert.notStrictEqual(res.headers.etag, etag);

      const audit = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({
          event_type: STAFF_AUDIT_EVENT_TYPES.PROFILE_UPDATE,
          profile_id: toObjectId(otherProfileId),
        });
      assert.ok(audit);
    });

    test("own profile PATCH with code in body returns 400 INVALID_PARAM", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: buildMeshHeaders({ userId: staffUserId, role: "staff" }),
      });
      const etag = getRes.headers.etag;

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: {
          ...patchHeaders({ userId: staffUserId, role: "staff" }),
          "if-match": etag,
        },
        payload: {
          code: "SHOULD-NOT-CHANGE",
          lastname: "SelfPatched",
        },
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.json().code, CODES.INVALID_PARAM);
    });

    test("forbidden patch field status returns 400 INVALID_PARAM", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: buildMeshHeaders({ userId: staffUserId, role: "staff" }),
      });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/staff/profiles/${staffProfileId}`,
        headers: {
          ...patchHeaders({ userId: staffUserId, role: "staff" }),
          "if-match": getRes.headers.etag,
        },
        payload: { status: "archived" },
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.json().code, CODES.INVALID_PARAM);
    });
  });
}
