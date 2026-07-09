#!/usr/bin/env node
/**
 * Idempotent auth MongoDB indexes — single source for init-db, seed, and tests.
 * Target shape: prod baseline + repo-wins (see docs/audit/prod-repo-drift-*.md).
 */
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensurePlatformBranchIndexes } from './seed-data/ensure-zero-hq.mjs'

/** @typedef {{ collection: string, keys: Record<string, number>, name: string, unique?: boolean, expireAfterSeconds?: number }} IndexSpec */

/** @type {IndexSpec[]} */
export const AUTH_INDEX_MANIFEST = [
  {
    collection: AUTH_COLLECTIONS.USERS,
    keys: { username: 1 },
    name: 'uniq_username',
    unique: true
  },
  {
    collection: AUTH_COLLECTIONS.USERS,
    keys: { ou_id: 1, branch_id: 1 },
    name: 'by_ou_branch'
  },
  {
    collection: AUTH_COLLECTIONS.USERS,
    keys: { ou_id: 1, role: 1 },
    name: 'by_ou_role'
  },
  {
    collection: AUTH_COLLECTIONS.REFRESH_TOKENS,
    keys: { token_hash: 1 },
    name: 'uniq_token_hash',
    unique: true
  },
  {
    collection: AUTH_COLLECTIONS.REFRESH_TOKENS,
    keys: { user_id: 1, revoked_at: 1, expires_at: 1 },
    name: 'by_user_revoked_exp'
  },
  {
    collection: AUTH_COLLECTIONS.REFRESH_TOKENS,
    keys: { family_id: 1 },
    name: 'by_family'
  },
  {
    collection: AUTH_COLLECTIONS.REFRESH_TOKENS,
    keys: { expires_at: 1 },
    name: 'ttl_expires_at',
    expireAfterSeconds: 0
  },
  {
    collection: AUTH_COLLECTIONS.CREDENTIAL_THROTTLE,
    keys: { throttle_key: 1 },
    name: 'uniq_throttle_key',
    unique: true
  },
  {
    collection: AUTH_COLLECTIONS.AUDIT_EVENTS,
    keys: { request_id: 1 },
    name: 'by_request_id'
  },
  {
    collection: AUTH_COLLECTIONS.AUDIT_EVENTS,
    keys: { retention_until: 1 },
    name: 'ttl_retention_until',
    expireAfterSeconds: 0
  },
  {
    collection: AUTH_COLLECTIONS.MENUS,
    keys: { key: 1 },
    name: 'uniq_menu_key',
    unique: true
  },
  {
    collection: AUTH_COLLECTIONS.MENUS,
    keys: { parent_key: 1 },
    name: 'by_parent_key'
  },
  {
    collection: AUTH_COLLECTIONS.ROLE_PERMISSIONS,
    keys: { ou_id: 1, role: 1 },
    name: 'uniq_ou_role',
    unique: true
  }
]

/**
 * @param {import('mongodb').Db} db
 */
export async function ensureAuthIndexes(db) {
  for (const spec of AUTH_INDEX_MANIFEST) {
    const options = { name: spec.name }
    if (spec.unique) options.unique = true
    if (spec.expireAfterSeconds != null) options.expireAfterSeconds = spec.expireAfterSeconds
    await db.collection(spec.collection).createIndex(spec.keys, options)
  }
  await ensurePlatformBranchIndexes(db)
}
