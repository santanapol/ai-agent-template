#!/usr/bin/env node
/**
 * ใส่ข้อมูล items ตัวอย่างใน MongoDB (dev เท่านั้น)
 *
 *   npm run seed:example
 *
 * ให้ตรงกับ user จาก auth seed (gateway E2E):
 *   SEED_OU_ID / SEED_BRANCH_ID จาก stdout ของ `npm run seed:example` ที่ auth
 *
 * ล้าง items ของ tenant ก่อน seed ใหม่:
 *   npm run seed:example -- --reset-items
 */
import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI is required (ใช้กับ --env-file=.env)')
  process.exit(1)
}

const dbName = process.env.DB_NAME || 'service-demo'
const resetItems = process.argv.includes('--reset-items')
const SEED_PROG = 'scripts/seed-example-data.mjs'
const SEED_USER = process.env.SEED_USER_ID ?? 'seed_script'

const ouId = process.env.SEED_OU_ID ? new ObjectId(process.env.SEED_OU_ID) : new ObjectId()
const branchId = process.env.SEED_BRANCH_ID
  ? new ObjectId(process.env.SEED_BRANCH_ID)
  : new ObjectId()

/** @type {{ code: string, name: string, description: string | null, status: string, tags: string[] }[]} */
const examples = [
  {
    code: 'DEMO-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse for office use',
    status: 'active',
    tags: ['hardware', 'peripheral']
  },
  {
    code: 'DEMO-002',
    name: 'USB-C Hub',
    description: '7-in-1 hub — draft listing',
    status: 'draft',
    tags: ['hardware']
  },
  {
    code: 'DEMO-003',
    name: 'Legacy Keyboard',
    description: null,
    status: 'inactive',
    tags: []
  }
]

const client = new MongoClient(uri)
await client.connect()
const db = client.db(dbName)
const col = db.collection('items')

const tenantFilter = { ou_id: ouId, branch_id: branchId }

if (resetItems) {
  const removed = await col.deleteMany(tenantFilter)
  console.log(`Cleared items for tenant: ${removed.deletedCount} document(s)`)
}

const now = new Date()
let inserted = 0
let updated = 0

for (const row of examples) {
  const result = await col.updateOne(
    { ...tenantFilter, code: row.code },
    {
      $set: {
        name: row.name,
        description: row.description,
        status: row.status,
        tags: row.tags,
        upd_by: SEED_USER,
        upd_date: now,
        upd_prog: SEED_PROG
      },
      $setOnInsert: {
        _id: new ObjectId(),
        ou_id: ouId,
        branch_id: branchId,
        code: row.code,
        cr_by: SEED_USER,
        cr_date: now,
        cr_prog: SEED_PROG
      }
    },
    { upsert: true }
  )
  if (result.upsertedCount > 0) inserted += 1
  else if (result.modifiedCount > 0) updated += 1
  console.log('Item OK:', row.code, row.status)
}

await client.close()

console.log('')
console.log('=== สรุป seed ===')
console.log(`  inserted: ${inserted}  updated: ${updated}`)
console.log(`  ou_id:     ${ouId.toHexString()}`)
console.log(`  branch_id: ${branchId.toHexString()}`)
console.log('')
console.log('--- mesh headers (direct smoke / Bruno) ---')
console.log(`  x-user-ou: ${ouId.toHexString()}`)
console.log(`  x-user-branch: ${branchId.toHexString()}`)
console.log(`  x-user-id: ${SEED_USER}`)
console.log('')
console.log('Gateway E2E: ใช้ SEED_OU_ID/SEED_BRANCH_ID เดียวกับ auth seed แล้ว login ด้วย user ใน tenant นั้น')
console.log('หรือรัน: SEED_OU_ID=<hex> SEED_BRANCH_ID=<hex> npm run seed:example')
