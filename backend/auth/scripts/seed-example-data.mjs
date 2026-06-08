#!/usr/bin/env node
/**
 * สร้างข้อมูลตัวอย่างใน MongoDB (dev เท่านั้น) — users + indexes ตาม `docs/architecture.md` §8.3–8.4
 *
 *   npm run seed:example
 *
 * รหัส default อยู่ใน repo เพื่อความสะดวก local เท่านั้น — ห้ามใช้ใน production
 * กำหนดเองได้: EXAMPLE_ADMIN_PASSWORD, EXAMPLE_BRANCH_ADMIN_PASSWORD, EXAMPLE_STAFF_PASSWORD
 *
 * ล้าง token/throttle/audit ก่อน seed user: npm run seed:example -- --reset-sessions
 */
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from '../test/helpers/ensure-indexes.mjs'

function normalizeUsername(u) {
  return String(u).trim().toLowerCase()
}

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI is required (ใช้กับ --env-file=.env)')
  process.exit(1)
}

const resetSessions = process.argv.includes('--reset-sessions')

const mem = Number(process.env.ARGON2_MEMORY_KIB ?? 65_536)
const time = Number(process.env.ARGON2_TIME ?? 3)
const parallel = Number(process.env.ARGON2_PARALLELISM ?? 4)

const argonOpts = {
  type: argon2.argon2id,
  memoryCost: mem,
  timeCost: time,
  parallelism: parallel
}

// Dev seed: shared OU + branch for all example users (ซิงค์ให้ตรงกับ demo-service)
// branch_id ต้องชี้ไปยัง branch จริงใน gpp_777ww.su_branch (ou_id เดียวกัน) มิฉะนั้น
// `GET /api/v1/invoices/agent` จะ resolve ชื่อ branch ไม่ได้ — ใช้ "777WW" (ou_id 5f4f9d57266ed249e45ecef5)
const DEV_SEED_OU_ID = "5f4f9d57266ed249e45ecef5"
const DEV_SEED_BRANCH_ID = "5f4fb5bb3156af7a2db9e5a0"

const SEED_OU_ID = process.env.SEED_OU_ID ? new ObjectId(process.env.SEED_OU_ID) : new ObjectId(DEV_SEED_OU_ID)
const SEED_BRANCH_ID = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId(DEV_SEED_BRANCH_ID)
const SEED_PROG = 'scripts/seed-example-data.mjs'

/** @type {{ _id: ObjectId, username: string, password: string, role: string }[]} */
const examples = [
  {
    _id: new ObjectId('6a153e4c84136d940330991e'),
    username: 'platform_admin',
    password: process.env.EXAMPLE_ADMIN_PASSWORD ?? '1234',
    role: 'platform_admin'
  },
  {
    _id: new ObjectId('6a190d6db5711c10d35d85e8'),
    username: 'branch_admin',
    password: process.env.EXAMPLE_BRANCH_ADMIN_PASSWORD ?? '1234',
    role: 'branch_admin'
  },
  {
    _id: new ObjectId('6a190d6db5711c10d35d85ea'),
    username: 'staff',
    password: process.env.EXAMPLE_STAFF_PASSWORD ?? '1234',
    role: 'staff'
  }
]

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

await ensureAuthIndexes(db)

if (resetSessions) {
  await db.collection(AUTH_COLLECTIONS.REFRESH_TOKENS).deleteMany({})
  await db.collection(AUTH_COLLECTIONS.CREDENTIAL_THROTTLE).deleteMany({})
  await db.collection(AUTH_COLLECTIONS.AUDIT_EVENTS).deleteMany({})
  console.log('Cleared auth_refresh_tokens, auth_credential_throttle, auth_audit_events')
}

const now = new Date()
for (const row of examples) {
  const username = normalizeUsername(row.username)
  const password_hash = await argon2.hash(row.password, argonOpts)
  const existingUser = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ _id: row._id })
  const userDoc = {
    _id: row._id,
    ou_id: existingUser?.ou_id ?? SEED_OU_ID,
    branch_id: existingUser?.branch_id ?? SEED_BRANCH_ID,
    username,
    password_hash,
    role: row.role,
    access_token_gen: existingUser?.access_token_gen ?? 0,
    cr_by: existingUser?.cr_by ?? 'seed_script',
    cr_date: existingUser?.cr_date ?? now,
    cr_prog: existingUser?.cr_prog ?? SEED_PROG,
    upd_by: 'seed_script',
    upd_date: now,
    upd_prog: SEED_PROG
  }
  
  await db.collection(AUTH_COLLECTIONS.USERS).replaceOne(
    { _id: row._id },
    userDoc,
    { upsert: true }
  )
  const userId = row._id
  if (userId) {
    const existingProfile = await db.collection('staff_profiles').findOne({ user_id: userId })
    const profileDoc = {
      _id: existingProfile?._id ?? new ObjectId(),
      user_id: userId,
      ou_id: existingProfile?.ou_id ?? SEED_OU_ID,
      branch_id: existingProfile?.branch_id ?? SEED_BRANCH_ID,
      code: existingProfile?.code ?? `SEED-${username.toUpperCase()}`,
      firstname: existingProfile?.firstname ?? 'Seed',
      lastname: existingProfile?.lastname ?? username,
      email: existingProfile?.email ?? `${username}@example.com`,
      tel: existingProfile?.tel ?? '',
      status: existingProfile?.status ?? 'active',
      cr_by: existingProfile?.cr_by ?? 'seed_script',
      cr_date: existingProfile?.cr_date ?? now,
      cr_prog: existingProfile?.cr_prog ?? SEED_PROG,
      upd_by: 'seed_script',
      upd_date: now,
      upd_prog: SEED_PROG
    }
    
    await db.collection('staff_profiles').replaceOne(
      { user_id: userId },
      profileDoc,
      { upsert: true }
    )
  }
  console.log('User OK:', username, userId?.toHexString?.() ?? '(unknown)')
}

await client.close()

console.log('')
console.log('--- ตัวอย่าง login (client_kind: native → refresh ใน JSON body) ---')
console.log('username     | password (เปลี่ยนผ่าน env ได้)')
console.log('-------------+--------------------------------')
for (const row of examples) {
  console.log(`${row.username.padEnd(12)} | ${row.password}`)
}
console.log('')
console.log('ตัวอย่าง body: ดู examples/login-native.body.json')
console.log('ou_id:', SEED_OU_ID.toHexString(), '| branch_id:', SEED_BRANCH_ID.toHexString())
