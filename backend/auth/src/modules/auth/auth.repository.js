import { AUTH_COLLECTIONS } from '../../config/mongo-collections.js'

const USERS = AUTH_COLLECTIONS.USERS
const REFRESH = AUTH_COLLECTIONS.REFRESH_TOKENS
const THROTTLE = AUTH_COLLECTIONS.CREDENTIAL_THROTTLE
const AUDIT = AUTH_COLLECTIONS.AUDIT_EVENTS
const MENUS = AUTH_COLLECTIONS.MENUS
const ROLE_PERMISSIONS = AUTH_COLLECTIONS.ROLE_PERMISSIONS

const RETENTION_DAYS = 180

export class AuthRepository {
  /**
   * @param {import('mongodb').Db} db
   */
  constructor(db) {
    this.db = db
  }

  async findUserByUsername(username) {
    return this.db.collection(USERS).findOne({ username })
  }

  async findUserById(id) {
    return this.db.collection(USERS).findOne({ _id: id })
  }

  /**
   * Create a new user with tenant + audit fields.
   * Canonical order: _id, ou_id, branch_id, business fields, audit fields.
   * Called from User Management API (behind gateway).
   * @param {{ ou_id: import('mongodb').ObjectId, branch_id: import('mongodb').ObjectId, username: string, password_hash: string, role: string }} data
   * @param {{ user_id: string, route: string }} actor — derived from gateway-injected headers
   */
  async createUser(data, actor) {
    const now = new Date()
    const doc = {
      ou_id: data.ou_id,
      branch_id: data.branch_id,
      username: data.username,
      password_hash: data.password_hash,
      role: data.role,
      access_token_gen: 0,
      cr_by: actor.user_id,
      cr_date: now,
      cr_prog: actor.route,
      upd_by: actor.user_id,
      upd_date: now,
      upd_prog: actor.route
    }
    const res = await this.db.collection(USERS).insertOne(doc)
    return res.insertedId
  }

  /**
   * Update user role.
   * @param {import('mongodb').ObjectId} userId
   * @param {string} role
   * @param {{ user_id: string, route: string }} actor
   * @param {import('mongodb').ClientSession} [session]
   */
  async updateUserRole(userId, role, actor, session) {
    const now = new Date()
    const result = await this.db.collection(USERS).updateOne(
      { _id: userId },
      {
        $set: {
          role,
          upd_by: actor.user_id,
          upd_date: now,
          upd_prog: actor.route
        }
      },
      { session }
    )
    return { matchedCount: result.matchedCount }
  }

  /**
   * Update user fields with audit refresh.
   * Returns matchedCount for ETag / 404 disambiguation.
   * @param {import('mongodb').ObjectId} id
   * @param {import('mongodb').ObjectId} ou_id
   * @param {import('mongodb').ObjectId} branch_id
   * @param {Date} ifMatchDate — decoded from If-Match ETag
   * @param {Record<string, unknown>} fields — business fields to update
   * @param {{ user_id: string, route: string }} actor
   */
  async updateUser(id, ou_id, branch_id, ifMatchDate, fields, actor) {
    const now = new Date()
    const result = await this.db.collection(USERS).updateOne(
      { _id: id, ou_id, branch_id, upd_date: ifMatchDate },
      {
        $set: {
          ...fields,
          upd_by: actor.user_id,
          upd_date: now,
          upd_prog: actor.route
        }
      }
    )
    return { matchedCount: result.matchedCount, updatedDate: now }
  }

  /**
   * Find user by id scoped to tenant (for 404 vs 412 disambiguation).
   */
  async findUserByIdAndTenant(id, ou_id, branch_id) {
    return this.db.collection(USERS).findOne({ _id: id, ou_id, branch_id })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async getThrottle(throttle_key, session) {
    return this.db.collection(THROTTLE).findOne({ throttle_key }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async setThrottle(throttle_key, fields, session) {
    await this.db
      .collection(THROTTLE)
      .updateOne({ throttle_key }, { $set: { throttle_key, ...fields } }, { upsert: true, session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async deleteThrottleKeys(keys, session) {
    if (!keys.length) return
    await this.db.collection(THROTTLE).deleteMany({ throttle_key: { $in: keys } }, { session })
  }

  async insertRefreshToken(doc, session) {
    const now = new Date()
    const row = {
      user_id: doc.user_id,
      family_id: doc.family_id,
      token_hash: doc.token_hash,
      expires_at: doc.expires_at,
      active_branch_id: doc.active_branch_id ?? null,
      revoked_at: null,
      replaced_by_id: null,
      created_at: now
    }
    const res = await this.db.collection(REFRESH).insertOne(row, { session })
    return res.insertedId
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async findRefreshByTokenHash(token_hash, session) {
    return this.db.collection(REFRESH).findOne({ token_hash }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async revokeRefreshById(id, revoked_at, session) {
    await this.db.collection(REFRESH).updateOne({ _id: id }, { $set: { revoked_at } }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async revokeFamilyActive(family_id, revoked_at, session) {
    await this.db
      .collection(REFRESH)
      .updateMany({ family_id, revoked_at: null }, { $set: { revoked_at } }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async setReplacedBy(oldId, newId, session) {
    await this.db
      .collection(REFRESH)
      .updateOne({ _id: oldId }, { $set: { replaced_by_id: newId } }, { session })
  }

  /**
   * Persist active branch on the current refresh row (no rotate).
   * @param {import('mongodb').ObjectId} id
   * @param {import('mongodb').ObjectId | null} active_branch_id
   * @param {import('mongodb').ClientSession} [session]
   */
  async setRefreshActiveBranch(id, active_branch_id, session) {
    await this.db
      .collection(REFRESH)
      .updateOne({ _id: id }, { $set: { active_branch_id } }, { session })
  }

  /**
   * Query ดิบต่อหนึ่งคู่ (ou_id, role) — fallback logic อยู่ที่ service layer
   * Tenant scoping ระดับ ou_id เท่านั้น (สิทธิ์เป็นข้อมูลระดับ OU โดยดีไซน์ — ดู SPEC)
   * @param {import('mongodb').ObjectId | null} ouId
   * @param {string} role
   */
  async findRolePermissions(ouId, role) {
    return this.db.collection(ROLE_PERMISSIONS).findOne({ ou_id: ouId, role })
  }

  /**
   * Action ทั้งหมดที่มองเห็นได้จาก OU นี้ (เมนูสากล + เมนูเฉพาะ OU)
   * @param {import('mongodb').ObjectId} ouId
   */
  async findActionMenusForOu(ouId) {
    return this.db
      .collection(MENUS)
      .find({ type: 'action', ou_id: { $in: [null, ouId] } })
      .toArray()
  }

  /**
   * เมนูตามรายการ key (ใช้ดึงโหนดบรรพบุรุษของ action ที่ผ่านการคัดสิทธิ์)
   * @param {string[]} keys
   * @param {import('mongodb').ObjectId} ouId
   */
  async findMenusByKeys(keys, ouId) {
    if (!keys.length) return []
    return this.db
      .collection(MENUS)
      .find({ key: { $in: keys }, ou_id: { $in: [null, ouId] } })
      .toArray()
  }

  async insertAudit(row) {
    const ts = row.ts ?? new Date()
    const retention_until = new Date(ts.getTime() + RETENTION_DAYS * 86_400_000)
    await this.db.collection(AUDIT).insertOne({
      event_type: row.event_type,
      ts,
      outcome: row.outcome,
      request_id: row.request_id,
      user_id: row.user_id ?? null,
      ip_digest: row.ip_digest ?? null,
      detail_safe: row.detail_safe ?? null,
      retention_until
    })
  }

  /**
   * Bump `access_token_gen` and revoke active refresh tokens for a user (O-16).
   * @param {import('mongodb').ObjectId} userId
   * @param {Date} revokedAt
   * @param {import('mongodb').ClientSession} [session]
   */
  /**
   * @param {import('mongodb').ObjectId} userId
   * @param {string} password_hash
   * @param {{ user_id: string, route: string }} actor
   * @param {import('mongodb').ClientSession} [session]
   */
  async updatePasswordHash(userId, password_hash, actor, session) {
    const now = new Date()
    const result = await this.db.collection(USERS).updateOne(
      { _id: userId },
      {
        $set: {
          password_hash,
          upd_by: actor.user_id,
          upd_date: now,
          upd_prog: actor.route
        }
      },
      { session }
    )
    return result.matchedCount > 0
  }

  /**
   * Bump `access_token_gen` without revoking refresh tokens (branch switch).
   * @param {import('mongodb').ObjectId} userId
   * @param {import('mongodb').ClientSession} [session]
   */
  async bumpAccessTokenGen(userId, session) {
    const user = await this.db
      .collection(USERS)
      .findOneAndUpdate(
        { _id: userId },
        { $inc: { access_token_gen: 1 } },
        { session, returnDocument: 'after' }
      )

    if (!user) {
      return { found: false, access_token_gen: 0, user: null }
    }

    const gen =
      typeof user.access_token_gen === 'number' && Number.isInteger(user.access_token_gen)
        ? user.access_token_gen
        : 0

    return { found: true, access_token_gen: gen, user }
  }

  async bumpAccessTokenGenAndRevokeSessions(userId, revokedAt, session) {
    const user = await this.db
      .collection(USERS)
      .findOneAndUpdate(
        { _id: userId },
        { $inc: { access_token_gen: 1 } },
        { session, returnDocument: 'after' }
      )

    if (!user) {
      return { found: false, access_token_gen: 0, revoked_refresh_tokens: 0 }
    }

    const revokeResult = await this.db
      .collection(REFRESH)
      .updateMany(
        { user_id: userId, revoked_at: null },
        { $set: { revoked_at: revokedAt } },
        { session }
      )

    const gen =
      typeof user.access_token_gen === 'number' && Number.isInteger(user.access_token_gen)
        ? user.access_token_gen
        : 0

    return {
      found: true,
      access_token_gen: gen,
      revoked_refresh_tokens: revokeResult.modifiedCount
    }
  }
}
