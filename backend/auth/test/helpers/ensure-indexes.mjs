import { AUTH_COLLECTIONS } from '../../src/config/mongo-collections.js'

/**
 * Indexes aligned with `docs/architecture.md` section 8.4 (required for refresh + throttle).
 * @param {import('mongodb').Db} db
 */
export async function ensureAuthIndexes(db) {
  await db
    .collection(AUTH_COLLECTIONS.USERS)
    .createIndex({ username: 1 }, { unique: true, name: 'uniq_username' })
  await db
    .collection(AUTH_COLLECTIONS.USERS)
    .createIndex({ ou_id: 1, branch_id: 1 }, { name: 'by_ou_branch' })
  await db
    .collection(AUTH_COLLECTIONS.USERS)
    .createIndex({ ou_id: 1, role: 1 }, { name: 'by_ou_role' })
  await db
    .collection(AUTH_COLLECTIONS.REFRESH_TOKENS)
    .createIndex({ token_hash: 1 }, { unique: true, name: 'uniq_token_hash' })
  await db
    .collection(AUTH_COLLECTIONS.REFRESH_TOKENS)
    .createIndex({ user_id: 1, revoked_at: 1, expires_at: 1 }, { name: 'by_user_revoked_exp' })
  await db
    .collection(AUTH_COLLECTIONS.REFRESH_TOKENS)
    .createIndex({ family_id: 1 }, { name: 'by_family' })
  await db
    .collection(AUTH_COLLECTIONS.REFRESH_TOKENS)
    .createIndex({ expires_at: 1 }, { name: 'ttl_expires_at', expireAfterSeconds: 0 })
  await db
    .collection(AUTH_COLLECTIONS.CREDENTIAL_THROTTLE)
    .createIndex({ throttle_key: 1 }, { unique: true, name: 'uniq_throttle_key' })
  await db
    .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
    .createIndex({ request_id: 1 }, { name: 'by_request_id' })
  await db
    .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
    .createIndex({ retention_until: 1 }, { name: 'ttl_retention_until', expireAfterSeconds: 0 })
  await db
    .collection(AUTH_COLLECTIONS.MENUS)
    .createIndex({ key: 1 }, { unique: true, name: 'uniq_menu_key' })
  await db
    .collection(AUTH_COLLECTIONS.MENUS)
    .createIndex({ parent_key: 1 }, { name: 'by_parent_key' })
  await db
    .collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS)
    .createIndex({ ou_id: 1, role: 1 }, { unique: true, name: 'uniq_ou_role' })
}
