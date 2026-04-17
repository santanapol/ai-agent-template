/**
 * Create or update a dev user (Argon2id). Requires env (e.g. `node --env-file=.env`).
 *
 *   SEED_USERNAME=admin SEED_PASSWORD='...' node --env-file=.env scripts/seed-user.mjs
 */
import { MongoClient } from 'mongodb'
import argon2 from 'argon2'

function normalizeUsername (u) {
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

const mem = Number(process.env.ARGON2_MEMORY_KIB ?? 65_536)
const time = Number(process.env.ARGON2_TIME ?? 3)
const parallel = Number(process.env.ARGON2_PARALLELISM ?? 4)

const password_hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: mem,
  timeCost: time,
  parallelism: parallel
})

const client = new MongoClient(uri)
await client.connect()
const db = client.db()
const now = new Date()
const res = await db.collection('users').findOneAndUpdate(
  { username_normalized: username },
  {
    $set: {
      username_normalized: username,
      password_hash,
      role,
      updated_at: now
    },
    $setOnInsert: { created_at: now }
  },
  { upsert: true, returnDocument: 'after' }
)
await client.close()

console.log('Seed user OK:', res.value?._id?.toHexString?.() ?? '(unknown)')
