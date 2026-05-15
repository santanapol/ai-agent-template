/**
 * Create or update a dev user (Argon2id). Requires env (e.g. `node --env-file=.env`).
 *
 *   SEED_USERNAME=admin SEED_PASSWORD='...' SEED_OU_ID=<hex24> SEED_BRANCH_ID=<hex24> node --env-file=.env scripts/seed-user.mjs
 */
import { MongoClient, ObjectId } from 'mongodb'
import argon2 from 'argon2'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'

function normalizeUsername(u) {
  return String(u).trim().toLowerCase()
}

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI is required')
  process.exit(1)
}

const username = normalizeUsername(process.env.SEED_USERNAME ?? 'admin')
const password = process.env.SEED_PASSWORD ?? 'change-me-now'
const role = process.env.SEED_ROLE ?? 'user'

const ouId = process.env.SEED_OU_ID ? new ObjectId(process.env.SEED_OU_ID) : new ObjectId()
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId()

const mem = Number(process.env.ARGON2_MEMORY_KIB ?? 65_536)
const time = Number(process.env.ARGON2_TIME ?? 3)
const parallel = Number(process.env.ARGON2_PARALLELISM ?? 4)

const password_hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: mem,
  timeCost: time,
  parallelism: parallel
})

const SEED_PROG = 'scripts/seed-user.mjs'

const client = new MongoClient(uri)
await client.connect()
const db = client.db()
const now = new Date()
const res = await db.collection(AUTH_COLLECTIONS.USERS).findOneAndUpdate(
  { username },
  {
    $set: {
      username,
      password_hash,
      role,
      upd_by: 'seed_script',
      upd_date: now,
      upd_prog: SEED_PROG
    },
    $setOnInsert: {
      ou_id: ouId,
      branch_id: branchId,
      access_token_gen: 0,
      cr_by: 'seed_script',
      cr_date: now,
      cr_prog: SEED_PROG
    }
  },
  { upsert: true, returnDocument: 'after' }
)
await client.close()

console.log(
  'Seed user OK:',
  res.value?._id?.toHexString?.() ?? '(unknown)',
  '| ou_id:',
  ouId.toHexString(),
  '| branch_id:',
  branchId.toHexString()
)
