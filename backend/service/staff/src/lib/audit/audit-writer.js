import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { STAFF_COLLECTIONS } from "../../config/mongo-collections.js";

function toObjectId(value) {
  if (value instanceof ObjectId) {
    return value;
  }
  if (typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) {
    return new ObjectId(value);
  }
  throw new Error(`Invalid ObjectId: ${value}`);
}

function auditCollection() {
  return getDatabase().collection(STAFF_COLLECTIONS.AUDIT_EVENTS);
}

/**
 * Append a staff audit event to auth_audit_events.
 *
 * @param {object} params
 * @param {string} params.eventType e.g. staff.profile_create
 * @param {{ userId: string, ouId: string, branchId: string }} params.userContext
 * @param {string} params.routeTemplate e.g. POST /api/v1/staff/profiles
 * @param {string} [params.profileId] profile _id hex24
 * @param {string} [params.targetUserId] auth_users _id hex24
 * @param {Record<string, unknown>} [params.payload]
 */
export async function writeAuditEvent({
  eventType,
  userContext,
  routeTemplate,
  profileId,
  targetUserId,
  payload,
}) {
  const now = new Date();
  const actorId = toObjectId(userContext.userId);

  const doc = {
    event_type: eventType,
    ou_id: toObjectId(userContext.ouId),
    branch_id: toObjectId(userContext.branchId),
    actor_id: actorId,
    cr_by: userContext.userId,
    cr_date: now,
    cr_prog: routeTemplate,
    upd_by: userContext.userId,
    upd_date: now,
    upd_prog: routeTemplate,
  };

  if (profileId) {
    doc.profile_id = toObjectId(profileId);
  }
  if (targetUserId) {
    doc.target_user_id = toObjectId(targetUserId);
  }
  if (payload && Object.keys(payload).length > 0) {
    doc.payload = payload;
  }

  const result = await auditCollection().insertOne(doc);
  return { id: result.insertedId.toString(), event: doc };
}
