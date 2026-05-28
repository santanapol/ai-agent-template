#!/usr/bin/env node
/**
 * สร้าง indexes บน collection `items` — ใช้ตั้งต้น environment ใหม่
 *
 * ใช้งาน:
 *   npm run init:db
 *   node --env-file=.env scripts/init-db.mjs
 */
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI is required (ใช้กับ --env-file=.env)')
  process.exit(1)
}

const dbName = process.env.DB_NAME || 'service-demo'
const COLLECTION = 'items'

const client = new MongoClient(uri)
await client.connect()
const db = client.db(dbName)
const col = db.collection(COLLECTION)

console.log('=== init-db: indexes สำหรับ crud-service ===')
console.log(`Database: ${db.databaseName}`)
console.log(`Collection: ${COLLECTION}`)
console.log('')

console.log('▶ สร้าง indexes (ตาม docs/db/erd.md §6)...')

await col.createIndex(
  { ou_id: 1, branch_id: 1, _id: -1 },
  { name: 'IDX_ITEMS_TENANT_LIST', background: true }
)
await col.createIndex(
  { _id: 1, ou_id: 1, branch_id: 1, upd_date: 1 },
  { name: 'IDX_ITEMS_TENANT_VERSION_CHECK', background: true }
)
await col.createIndex(
  { ou_id: 1, branch_id: 1, code: 1 },
  { unique: true, name: 'IDX_ITEMS_TENANT_CODE_UNIQUE', background: true }
)

console.log('  ✔ IDX_ITEMS_TENANT_LIST')
console.log('  ✔ IDX_ITEMS_TENANT_VERSION_CHECK')
console.log('  ✔ IDX_ITEMS_TENANT_CODE_UNIQUE (unique per tenant)')
console.log('')

const count = await col.countDocuments()
console.log(`=== สรุป ===`)
console.log(`  documents ใน items: ${count}`)
console.log('')
console.log('ขั้นถัดไป (ข้อมูลตัวอย่าง): npm run seed:example')

await client.close()
