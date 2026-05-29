/**
 * MongoDB collection names (shared auth_* DB with auth service).
 */
export const STAFF_COLLECTIONS = Object.freeze({
  STAFF_PROFILES: "staff_profiles",
  USERS: "auth_users",
  AUDIT_EVENTS: "auth_audit_events",
});

export const STAFF_COLLECTION_NAME_LIST = Object.freeze(
  Object.values(STAFF_COLLECTIONS),
);
