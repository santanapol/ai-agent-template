const USERS = 'users'
const REFRESH = 'refresh_tokens'
const THROTTLE = 'credential_throttle'
const AUDIT = 'audit_events'

const RETENTION_DAYS = 180

export class AuthRepository {
  /**
   * @param {import('mongodb').Db} db
   */
  constructor (db) {
    this.db = db
  }

  async findUserByUsernameNormalized (username_normalized) {
    return this.db.collection(USERS).findOne({ username_normalized })
  }

  async findUserById (id) {
    return this.db.collection(USERS).findOne({ _id: id })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async getThrottle (throttle_key, session) {
    return this.db.collection(THROTTLE).findOne({ throttle_key }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async setThrottle (throttle_key, fields, session) {
    await this.db.collection(THROTTLE).updateOne(
      { throttle_key },
      { $set: { throttle_key, ...fields } },
      { upsert: true, session }
    )
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async deleteThrottleKeys (keys, session) {
    if (!keys.length) return
    await this.db.collection(THROTTLE).deleteMany({ throttle_key: { $in: keys } }, { session })
  }

  async insertRefreshToken (doc, session) {
    const now = new Date()
    const row = {
      user_id: doc.user_id,
      family_id: doc.family_id,
      token_hash: doc.token_hash,
      expires_at: doc.expires_at,
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
  async findRefreshByTokenHash (token_hash, session) {
    return this.db.collection(REFRESH).findOne({ token_hash }, { session })
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async revokeRefreshById (id, revoked_at, session) {
    await this.db.collection(REFRESH).updateOne(
      { _id: id },
      { $set: { revoked_at } },
      { session }
    )
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async revokeFamilyActive (family_id, revoked_at, session) {
    await this.db.collection(REFRESH).updateMany(
      { family_id, revoked_at: null },
      { $set: { revoked_at } },
      { session }
    )
  }

  /**
   * @param {import('mongodb').ClientSession} [session]
   */
  async setReplacedBy (oldId, newId, session) {
    await this.db.collection(REFRESH).updateOne(
      { _id: oldId },
      { $set: { replaced_by_id: newId } },
      { session }
    )
  }

  async insertAudit (row) {
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
}
