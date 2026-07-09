import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../config/env.js";
import { STAFF_COLLECTIONS } from "../../config/mongo-collections.js";
import { resetAuthInternalClientForTests } from "../../lib/clients/auth-internal.client.js";
import { buildMeshHeaders } from "../../lib/test-helpers/mesh-headers.js";
import { startMockAuthInternalServer } from "../../lib/test-helpers/mock-auth-internal-server.js";
import {
  getMetricsRegistry,
  resetMetricsForTests,
} from "../../lib/utils/metrics.js";
import {
  insertProfile,
  toObjectId,
} from "../../modules/profiles/profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());
const ouId = "507f1f77bcf86cd799439011";
const branchId = "507f1f77bcf86cd799439012";
const actorUserId = "507f1f77bcf86cd799439013";

function lifecycleHeaders(overrides = {}) {
  const headers = buildMeshHeaders(overrides);
  delete headers["content-type"];
  return headers;
}

if (!RUN) {
  describe("metrics endpoint (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../config/database.js");
  const { default: createApp } = await import("../../app.js");

  describe("metrics endpoint and revoke pending counter", () => {
    let app;
    let mockAuth;
    let profileId;
    let userId;

    const env = {
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
      authRevokeMaxRetries: 2,
      authRevokeBackoffMs: 1,
      metricsEnabled: true,
    };

    before(async () => {
      await connectDatabase();
      resetMetricsForTests();
      mockAuth = await startMockAuthInternalServer({
        getDatabase,
        serviceSecret: env.authInternalServiceSecret,
        actorUserId,
        revokeBehavior: "fail",
      });
      env.authInternalBaseUrl = mockAuth.baseUrl;
      resetAuthInternalClientForTests();
      app = await createApp(env);

      userId = new ObjectId();
      const now = new Date();
      await getDatabase()
        .collection(STAFF_COLLECTIONS.USERS)
        .insertOne({
          _id: userId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchId),
          username: `metrics.${Date.now()}@test.invalid`,
          password_hash: "x",
          role: "staff",
          access_token_gen: 0,
          cr_by: actorUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: actorUserId,
          upd_date: now,
          upd_prog: "test.setup",
        });

      const created = await insertProfile(
        {
          user_id: userId.toString(),
          code: `MTR-${Date.now()}`,
          firstname: "Metrics",
          lastname: "Counter",
          email: "metrics.counter@example.invalid",
          tel: "+66810000008",
        },
        { userId: actorUserId, ouId, branchId },
        "POST /api/v1/staff/profiles",
      );
      profileId = created.profile.id;
    });

    after(async () => {
      try {
        if (profileId) {
          await getDatabase()
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteOne({ _id: toObjectId(profileId) });
        }
        if (userId) {
          await getDatabase()
            .collection(STAFF_COLLECTIONS.USERS)
            .deleteOne({ _id: userId });
        }
      } finally {
        await app?.close();
        await mockAuth?.close();
        resetAuthInternalClientForTests();
        resetMetricsForTests();
        await closeDatabase();
      }
    });

    test("GET /metrics is exposed when METRICS_ENABLED=true", async () => {
      const res = await app.inject({ method: "GET", url: "/metrics" });
      assert.strictEqual(res.statusCode, 200);
      assert.match(res.headers["content-type"], /text\/plain/);
      assert.match(res.body, /staff_auth_revoke_pending_total/);
    });

    test("archive revoke pending increments counter", async () => {
      const adminUserId = new ObjectId().toString();
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/staff/profiles/${profileId}`,
        headers: lifecycleHeaders({
          userId: adminUserId,
          role: "platform_admin",
        }),
      });
      assert.strictEqual(getRes.statusCode, 200);

      const archiveRes = await app.inject({
        method: "POST",
        url: `/api/v1/staff/profiles/${profileId}/archive`,
        headers: {
          ...lifecycleHeaders({
            userId: adminUserId,
            role: "platform_admin",
          }),
          "if-match": getRes.headers.etag,
        },
      });
      assert.strictEqual(archiveRes.statusCode, 200);

      const metricsRes = await app.inject({ method: "GET", url: "/metrics" });
      assert.strictEqual(metricsRes.statusCode, 200);
      assert.match(metricsRes.body, /staff_auth_revoke_pending_total\s+1/);

      const value = await getMetricsRegistry().getSingleMetricAsString(
        "staff_auth_revoke_pending_total",
      );
      assert.match(value, /staff_auth_revoke_pending_total\s+1/);
    });
  });
}
