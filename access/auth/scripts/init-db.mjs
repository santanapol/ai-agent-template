#!/usr/bin/env node
/**
 * สร้าง database (indexes) + admin user 1 คน — ใช้ตั้งต้น environment ใหม่
 *
 * ใช้งาน:
 *   node --env-file=.env scripts/init-db.mjs
 *
 * กำหนดค่า admin ผ่าน env (หรือใช้ default dev):
 *   ADMIN_USERNAME     default: admin
 *   ADMIN_PASSWORD     default: ChangeMe!Admin-1  (ห้ามใช้ใน production!)
 *   ADMIN_ROLE         default: admin
 *   SEED_OU_ID         default: สร้าง ObjectId ใหม่
 *   SEED_BRANCH_ID     default: สร้าง ObjectId ใหม่
 */
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'

// ──────────────────────────── helpers ────────────────────────────

function normalizeUsername(u) {
  return String(u).trim().toLowerCase()
}

// ──────────────────────────── config ─────────────────────────────

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('❌ DATABASE_URI is required')
  process.exit(1)
}

const adminUsername = normalizeUsername(process.env.ADMIN_USERNAME ?? 'admin')
const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe!Admin-1'
const adminRole = process.env.ADMIN_ROLE ?? 'admin'

const ouId = process.env.SEED_OU_ID ? new ObjectId(process.env.SEED_OU_ID) : new ObjectId()
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId()

const mem = Number(process.env.ARGON2_MEMORY_KIB ?? 65_536)
const time = Number(process.env.ARGON2_TIME ?? 3)
const parallel = Number(process.env.ARGON2_PARALLELISM ?? 4)

const INIT_PROG = 'scripts/init-db.mjs'

// ──────────────────────────── main ───────────────────────────────

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

console.log('=== init-db: สร้าง indexes + admin user ===')
console.log(`Database: ${db.databaseName}`)
console.log('')

// ─── 1. Indexes (ตาม docs/architecture.md section 8.4) ─────────

console.log('▶ สร้าง indexes...')

// Collection: auth_users
await db
  .collection(AUTH_COLLECTIONS.USERS)
  .createIndex({ username: 1 }, { unique: true, name: 'uniq_username' })
await db.collection(AUTH_COLLECTIONS.USERS).createIndex({ ou_id: 1, branch_id: 1 }, { name: 'by_ou_branch' })

// Collection: auth_refresh_tokens
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

// Collection: auth_credential_throttle
await db
  .collection(AUTH_COLLECTIONS.CREDENTIAL_THROTTLE)
  .createIndex({ throttle_key: 1 }, { unique: true, name: 'uniq_throttle_key' })

// Collection: auth_audit_events
await db
  .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
  .createIndex({ request_id: 1 }, { name: 'by_request_id' })
await db
  .collection(AUTH_COLLECTIONS.AUDIT_EVENTS)
  .createIndex({ retention_until: 1 }, { name: 'ttl_retention_until', expireAfterSeconds: 0 })

console.log('  ✔ auth_users: uniq_username, by_ou_branch')
console.log(
  '  ✔ auth_refresh_tokens: uniq_token_hash, by_user_revoked_exp, by_family, ttl_expires_at'
)
console.log('  ✔ auth_credential_throttle: uniq_throttle_key')
console.log('  ✔ auth_audit_events: by_request_id, ttl_retention_until')
console.log('')

// ─── 2. Admin user ──────────────────────────────────────────────

console.log('▶ สร้าง admin user...')

const password_hash = await argon2.hash(adminPassword, {
  type: argon2.argon2id,
  memoryCost: mem,
  timeCost: time,
  parallelism: parallel
})

const now = new Date()
const existing = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username: adminUsername })

let userId
if (existing) {
  // อัปเดต — เฉพาะ mutable fields + audit refresh
  await db.collection(AUTH_COLLECTIONS.USERS).updateOne(
    { _id: existing._id },
    {
      $set: {
        password_hash,
        role: adminRole,
        upd_by: 'init_db',
        upd_date: now,
        upd_prog: INIT_PROG
      }
    }
  )
  userId = existing._id
  console.log('  ✔ Admin user updated (existing)')
} else {
  // สร้างใหม่ — canonical order: _id, ou_id, branch_id, business, audit
  const res = await db.collection(AUTH_COLLECTIONS.USERS).insertOne({
    ou_id: ouId,
    branch_id: branchId,
    username: adminUsername,
    password_hash,
    role: adminRole,
    cr_by: 'init_db',
    cr_date: now,
    cr_prog: INIT_PROG,
    upd_by: 'init_db',
    upd_date: now,
    upd_prog: INIT_PROG
  })
  userId = res.insertedId
  console.log('  ✔ Admin user created (new)')
}

await client.close()

console.log('')
console.log('=== สรุป ===')
console.log(`  _id:       ${userId.toHexString()}`)
console.log(`  username:  ${adminUsername}`)
console.log(`  role:      ${adminRole}`)
console.log(`  ou_id:     ${ouId.toHexString()}`)
console.log(`  branch_id: ${branchId.toHexString()}`)
console.log('')
console.log('⚠️  อย่าลืมเปลี่ยนรหัสผ่าน admin ก่อนใช้งานจริง!')
