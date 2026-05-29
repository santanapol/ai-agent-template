import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
import { STAFF_COLLECTIONS } from "../../../../config/mongo-collections.js";
import { STAFF_AUDIT_EVENT_TYPES } from "../../../../lib/audit/audit-events.js";
import { writeAuditEvent } from "../../../../lib/audit/audit-writer.js";
import {
  insertProfile,
  findById,
  findByUserId,
  toObjectId,
} from "../../profiles.repository.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

if (!RUN) {
  describe("profiles.repository (skipped — no MONGODB_URI)", () => {
    test("documented skip", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");

  const ouId = "507f1f77bcf86cd799439011";
  const branchId = "507f1f77bcf86cd799439012";
  const actorUserId = "507f1f77bcf86cd799439013";
  const routeTemplate = "POST /api/v1/staff/profiles";

  const userContext = {
    userId: actorUserId,
    ouId,
    branchId,
  };

  const scope = { ouId, branchId };

  describe("profiles.repository (integration)", () => {
    let linkedUserId;
    let profileId;
    let auditEventId;
    const code = `T06-${Date.now()}`;

    before(async () => {
      await connectDatabase();
      linkedUserId = new ObjectId();
      const now = new Date();
      await getDatabase()
        .collection(STAFF_COLLECTIONS.USERS)
        .insertOne({
          _id: linkedUserId,
          ou_id: toObjectId(ouId),
          branch_id: toObjectId(branchId),
          username: `t06repo.${Date.now()}@test.invalid`,
          password_hash: "test-hash-not-used",
          role: "staff",
          cr_by: actorUserId,
          cr_date: now,
          cr_prog: "test.setup",
          upd_by: actorUserId,
          upd_date: now,
          upd_prog: "test.setup",
        });
    });

    after(async () => {
      try {
        const db = getDatabase();
        if (profileId) {
          await db
            .collection(STAFF_COLLECTIONS.STAFF_PROFILES)
            .deleteOne({ _id: toObjectId(profileId) });
        }
        if (auditEventId) {
          await db
            .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
            .deleteOne({ _id: toObjectId(auditEventId) });
        }
        if (linkedUserId) {
          await db
            .collection(STAFF_COLLECTIONS.USERS)
            .deleteOne({ _id: linkedUserId });
        }
      } finally {
        await closeDatabase();
      }
    });

    test("insertProfile + findById + findByUserId round-trip", async () => {
      const created = await insertProfile(
        {
          user_id: linkedUserId.toString(),
          code,
          firstname: "Somchai",
          lastname: "Test",
          email: "somchai@example.invalid",
          tel: "+66812345678",
        },
        userContext,
        routeTemplate,
      );

      profileId = created.profile.id;
      assert.ok(created.etag);
      assert.strictEqual(created.profile.code, code);
      assert.ok(created.profile.user.username.length > 0);

      const byId = await findById(profileId, scope);
      assert.ok(byId);
      assert.strictEqual(byId.profile.id, profileId);
      assert.strictEqual(byId.profile.user.role, "staff");

      const byUser = await findByUserId(linkedUserId.toString(), scope);
      assert.ok(byUser);
      assert.strictEqual(byUser.profile.id, profileId);
    });

    test("writeAuditEvent persists auth_audit_events", async () => {
      const { id, event } = await writeAuditEvent({
        eventType: STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
        userContext,
        routeTemplate,
        profileId,
        targetUserId: linkedUserId.toString(),
        payload: { code },
      });

      auditEventId = id;
      const stored = await getDatabase()
        .collection(STAFF_COLLECTIONS.AUDIT_EVENTS)
        .findOne({ _id: toObjectId(id) });

      assert.ok(stored);
      assert.strictEqual(
        stored.event_type,
        STAFF_AUDIT_EVENT_TYPES.PROFILE_CREATE,
      );
      assert.strictEqual(stored.cr_by, actorUserId);
      assert.strictEqual(stored.cr_prog, routeTemplate);
      assert.ok(stored.ou_id.equals(event.ou_id));
      assert.ok(stored.actor_id.equals(toObjectId(actorUserId)));
      assert.strictEqual(stored.payload.code, code);
    });
  });
}
