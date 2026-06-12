/**
 * MongoDB collection names for auth.
 * `auth_*` prefix supports a single shared database across domains.
 */
export const AUTH_COLLECTIONS = Object.freeze({
  USERS: 'auth_users',
  REFRESH_TOKENS: 'auth_refresh_tokens',
  CREDENTIAL_THROTTLE: 'auth_credential_throttle',
  AUDIT_EVENTS: 'auth_audit_events',
  MENUS: 'auth_menus',
  ROLE_PERMISSIONS: 'auth_role_permissions'
})

/** Ordered list for test resets (same names as values). */
export const AUTH_COLLECTION_NAME_LIST = Object.freeze(Object.values(AUTH_COLLECTIONS))
