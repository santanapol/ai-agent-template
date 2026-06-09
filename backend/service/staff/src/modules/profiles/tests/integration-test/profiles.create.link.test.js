import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../../../lib/audit/audit-events.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";
import CODES from "../../../../lib/error-codes.js";
import { toObjectId } from "../../profiles.repository.js";

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
  describe("create profile link user_id (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("create profile with user_id", () => {
    let app;
    let linkUserId;
    let otherBranchUserId;
    const suffix = Date.now();
    const createdProfileIds = [];
    const createdUserIds = [];

    before(async () => {
      await connectDatabase();
      app = await createApp(testEnv);

      linkUserId = new ObjectId();
      otherBranchUserId = new ObjectId();
      const now = new Date();

      for (const user of [
        {
          _id: linkUserId,
          branch_id: branchA1,
          username: `t10.link.${suffix}@test.invalid`,
        },
        {
          _id: otherBranchUserId,
          branch_id: branchA2,
          username: `t10.other.${suffix}@test.invalid`,
        },
      ]) {
        createdUserIds.push(user._id);
        await getDatabase()
          .collection(STAFF_COLLECTIONS.USERS)
          .insertOne({
            _id: user._id,
            ou_id: toObjectId(ouId),
            branch_id: toObjectId(user.branch_id),
            username: user.username,
            password_hash: "test-hash-not-used",
            role: "staff",
            cr_by: adminUserId,
            cr_date: now,
            cr_prog: "test.setup",
            upd_by: adminUserId,
            upd_date: now,
            upd_prog: "test.setup",
          });
      }
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (createdProfileIds.length > 0) {
          await db.collection(STAFF_COLLECTIONS.STAFF_PROFILES).deleteMany({
            _id: { $in: createdProfileIds.map((id) => toObjectId(id)) },
          });
          await db.collection(STAFF_COLLECTIONS.AUDIT_EVENTS).deleteMany({
            profile_id: {
              $in: createdProfileIds.map((id) => toObjectId(id)),
            },
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

    function baseBody(code) {
      return {
        user_id: linkUserId.toString(),
        code,
        firstname: "Create",
        lastname: "Link",
        email: `Create.Link.${suffix}@EXAMPLE.invalid`,
        tel: "+66812345678",
      };
    }

    test("POST create with user_id returns 201 Location user snippet and audit", async () => {
      const code = `CRT-${suffix}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: baseBody(code),
      });

      assert.strictEqual(res.statusCode, 201);
      assert.ok(res.headers.location?.includes("/api/v1/staff/profiles/"));
      assert.ok(res.headers.etag);

      const body = res.json();
      assert.strictEqual(body.code, CODES.CREATED);
      assert.strictEqual(body.data.code, code);
      assert.strictEqual(
        body.data.email,
        `create.link.${suffix}@example.invalid`,
      );
      assert.strictEqual(
        body.data.user.username,
        `t10.link.${suffix}@test.invalid`,
      );
      createdProfileIds.push(body.data.id);

      const audit = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({ profile_id: toObjectId(body.data.id) });

      assert.ok(audit);
      assert.strictEqual(
        audit.event_type,
        STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
      );
      assert.strictEqual(audit.payload.code, code);
    });

    test("duplicate code in branch returns 409 DUPLICATE", async () => {
      const code = `DUP-CODE-${suffix}`;
      const firstUserId = new ObjectId();
      const secondUserId = new ObjectId();
      createdUserIds.push(firstUserId, secondUserId);
      const now = new Date();

      for (const user of [
        { _id: firstUserId, username: `t10.dup1.${suffix}@test.invalid` },
        { _id: secondUserId, username: `t10.dup2.${suffix}@test.invalid` },
      ]) {
        await getDatabase()
          .collection(STAFF_COLLECTIONS.USERS)
          .insertOne({
            _id: user._id,
            ou_id: toObjectId(ouId),
            branch_id: toObjectId(branchA1),
            username: user.username,
            password_hash: "x",
            role: "staff",
            cr_by: adminUserId,
            cr_date: now,
            cr_prog: "test.setup",
            upd_by: adminUserId,
            upd_date: now,
            upd_prog: "test.setup",
          });
      }

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: {
          user_id: firstUserId.toString(),
          code,
          firstname: "Dup",
          lastname: "One",
          email: `dup1.${suffix}@example.invalid`,
          tel: "+66812345670",
        },
      });
      assert.strictEqual(first.statusCode, 201);
      createdProfileIds.push(first.json().data.id);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: {
          user_id: secondUserId.toString(),
          code,
          firstname: "Dup",
          lastname: "Two",
          email: `dup2.${suffix}@example.invalid`,
          tel: "+66812345671",
        },
      });

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.json().code, CODES.DUPLICATE);
    });

    test("duplicate user_id returns 409 DUPLICATE", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: baseBody(`DUP-USER-${suffix}`),
      });

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.json().code, CODES.DUPLICATE);
    });

    test("username and password with user_id returns 400 INVALID_PARAM", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: {
          ...baseBody(`BAD-${suffix}`),
          username: "extra.user",
          password: "ExtraSecurePass1234!",
        },
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.json().code, CODES.INVALID_PARAM);
    });

    test("branch_admin cannot link user in another branch", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({
          role: "branch_admin",
          branchId: branchA1,
        }),
        payload: {
          user_id: otherBranchUserId.toString(),
          code: `XBR-${suffix}`,
          firstname: "Cross",
          lastname: "Branch",
          email: `cross.${suffix}@example.invalid`,
          tel: "+66812345679",
        },
      });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.json().code, CODES.INVALID_USER_CONTEXT);
    });
  });
}
