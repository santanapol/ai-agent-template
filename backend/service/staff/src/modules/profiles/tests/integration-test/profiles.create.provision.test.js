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
import { toObjectId } from "../../profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

const adminUserId = "507f1f77bcf86cd799439013";

if (!RUN) {
  describe("create profile provision (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("create profile provision", () => {
    let app;
    let mockAuth;
    const suffix = Date.now();
    const createdProfileIds = [];
    const createdUserIds = [];

    const testEnv = {
      appName: "staff-service",
      nodeEnv: "test",
      port: 3101,
      dbName: initialEnv.dbName || "zero-platform",
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
        defaultRole: testEnv.staffProvisionDefaultRole,
        actorUserId: adminUserId,
      });
      testEnv.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(testEnv);
    });

    after(async () => {
      const db = getDatabase();
      if (createdProfileIds.length > 0) {
        await db.collection(STAFF_COLLECTIONS.STAFF_PROFILES).deleteMany({
          _id: { $in: createdProfileIds.map((id) => toObjectId(id)) },
        });
      }
      if (createdUserIds.length > 0) {
        await db.collection(STAFF_COLLECTIONS.USERS).deleteMany({
          _id: { $in: createdUserIds.map((id) => toObjectId(id)) },
        });
      }
      await app?.close();
      await mockAuth?.close();
      resetAuthInternalClientForTests();
      await closeDatabase();
    });

    function provisionBody(overrides = {}) {
      return {
        code: `PROV-${suffix}`,
        firstname: "Provision",
        lastname: "User",
        email: `prov.${suffix}@example.invalid`,
        tel: "+66812345679",
        username: `prov.user.${suffix}@test.invalid`,
        password: "InitialSecurePass1234!",
        ...overrides,
      };
    }

    test("POST provision returns 201 profile user snippet and audit", async () => {
      const body = provisionBody();
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: body,
      });

      assert.strictEqual(res.statusCode, 201, JSON.stringify(res.json()));
      const envelope = res.json();
      assert.strictEqual(envelope.success, true);
      assert.strictEqual(envelope.code, CODES.CREATED);
      assert.ok(envelope.data.id);
      assert.strictEqual(
        envelope.data.user.username,
        body.username.toLowerCase(),
      );
      assert.strictEqual(envelope.data.user.role, "staff");
      assert.match(res.headers.location, /\/api\/v1\/staff\/profiles\//);

      createdProfileIds.push(envelope.data.id);
      createdUserIds.push(envelope.data.user_id);

      const audit = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({
          event_type: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
          profile_id: toObjectId(envelope.data.id),
        });
      assert.ok(audit);
    });

    test("POST provision without email and tel returns 201", async () => {
      const body = provisionBody({
        code: `PROV-NOCONTACT-${suffix}`,
        username: `prov.nocontact.${suffix}@test.invalid`,
      });
      delete body.email;
      delete body.tel;

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: body,
      });

      assert.strictEqual(res.statusCode, 201, JSON.stringify(res.json()));
      const envelope = res.json();
      assert.strictEqual(envelope.data.email, null);
      assert.strictEqual(envelope.data.tel, null);
      const raw = await getDatabase()
        .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
        .findOne({ _id: toObjectId(envelope.data.id) });
      assert.strictEqual(raw.email, undefined);
      assert.strictEqual(raw.tel, undefined);
      createdProfileIds.push(envelope.data.id);
      createdUserIds.push(envelope.data.user_id);
    });

    test("user_id with username returns 400 INVALID_PARAM", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: {
          ...provisionBody(),
          user_id: new ObjectId().toString(),
        },
      });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.json().code, CODES.INVALID_PARAM);
    });

    test("auth duplicate username returns 409 and does not insert profile", async () => {
      const username = `dup.prov.${suffix}@test.invalid`;
      const first = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: provisionBody({
          code: `PROV-DUP1-${suffix}`,
          username,
        }),
      });
      assert.strictEqual(first.statusCode, 201);
      createdProfileIds.push(first.json().data.id);
      createdUserIds.push(first.json().data.user_id);

      const beforeCount = await getDatabase()
        .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
        .countDocuments({ code: `PROV-DUP2-${suffix}` });

      const second = await app.inject({
        method: "POST",
        url: "/api/v1/staff/profiles",
        headers: buildMeshHeaders({ role: "platform_admin" }),
        payload: provisionBody({
          code: `PROV-DUP2-${suffix}`,
          username,
        }),
      });

      assert.strictEqual(second.statusCode, 409);
      assert.strictEqual(second.json().code, CODES.DUPLICATE);

      const afterCount = await getDatabase()
        .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
        .countDocuments({ code: `PROV-DUP2-${suffix}` });
      assert.strictEqual(afterCount, beforeCount);
    });
  });
}
