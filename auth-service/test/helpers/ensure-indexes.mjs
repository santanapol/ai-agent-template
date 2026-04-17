/**
 * Indexes aligned with auth-login-design.md section 8.4 (required for refresh + throttle).
 * @param {import('mongodb').Db} db
 */
export async function ensureAuthIndexes (db) {
  await db.collection('users').createIndex(
    { username_normalized: 1 },
    { unique: true, name: 'uniq_username_normalized' }
  )
  await db.collection('refresh_tokens').createIndex(
    { token_hash: 1 },
    { unique: true, name: 'uniq_token_hash' }
  )
  await db.collection('refresh_tokens').createIndex(
    { user_id: 1, revoked_at: 1, expires_at: 1 },
    { name: 'by_user_revoked_exp' }
  )
  await db.collection('refresh_tokens').createIndex({ family_id: 1 }, { name: 'by_family' })
  await db.collection('refresh_tokens').createIndex(
    { expires_at: 1 },
    { name: 'ttl_expires_at', expireAfterSeconds: 0 }
  )
  await db.collection('credential_throttle').createIndex(
    { throttle_key: 1 },
    { unique: true, name: 'uniq_throttle_key' }
  )
  await db.collection('audit_events').createIndex({ request_id: 1 }, { name: 'by_request_id' })
  await db.collection('audit_events').createIndex(
    { retention_until: 1 },
    { name: 'ttl_retention_until', expireAfterSeconds: 0 }
  )
}
