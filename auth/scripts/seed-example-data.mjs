#!/usr/bin/env node
/**
 * สร้างข้อมูลตัวอย่างใน MongoDB (dev เท่านั้น) — users + indexes ตาม `docs/architecture.md` §8.3–8.4
 *
 *   npm run seed:example
 *
 * รหัส default อยู่ใน repo เพื่อความสะดวก local เท่านั้น — ห้ามใช้ใน production
 * กำหนดเองได้: EXAMPLE_ADMIN_PASSWORD, EXAMPLE_DEMO_PASSWORD, EXAMPLE_VIEWER_PASSWORD
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

// Dev seed: shared OU + branch for all example users
const SEED_OU_ID = process.env.SEED_OU_ID ? new ObjectId(process.env.SEED_OU_ID) : new ObjectId()
const SEED_BRANCH_ID = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId()
const SEED_PROG = 'scripts/seed-example-data.mjs'

/** @type {{ username: string, password: string, role: string }[]} */
const examples = [
  {
    username: 'admin',
    password: process.env.EXAMPLE_ADMIN_PASSWORD ?? 'DevExample-admin-1',
    role: 'admin'
  },
  {
    username: 'demo',
    password: process.env.EXAMPLE_DEMO_PASSWORD ?? 'DevExample-demo-1',
    role: 'user'
  },
  {
    username: 'viewer',
    password: process.env.EXAMPLE_VIEWER_PASSWORD ?? 'DevExample-viewer-1',
    role: 'viewer'
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
  await db.collection(AUTH_COLLECTIONS.USERS).findOneAndUpdate(
    { username },
    {
      $set: {
        username,
        password_hash,
        role: row.role,
        upd_by: 'seed_script',
        upd_date: now,
        upd_prog: SEED_PROG
      },
      $setOnInsert: {
        ou_id: SEED_OU_ID,
        branch_id: SEED_BRANCH_ID,
        cr_by: 'seed_script',
        cr_date: now,
        cr_prog: SEED_PROG
      }
    },
    { upsert: true }
  )
  const doc = await db.collection(AUTH_COLLECTIONS.USERS).findOne({ username })
  console.log('User OK:', username, doc?._id?.toHexString?.() ?? '(unknown)')
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
