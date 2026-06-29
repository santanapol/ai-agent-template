#!/usr/bin/env node
/**
 * Upsert Zero HQ in zero-platform.platform_branches (ไม่แตะ gpp_777ww).
 *
 *   npm run seed:zero-hq
 *
 * Uses DATABASE_URI only.
 */
import { MongoClient } from 'mongodb'
import { ensureZeroHqBranch } from './seed-data/ensure-zero-hq.mjs'
import {
  ZERO_HQ_BRANCH_CODE,
  ZERO_HQ_BRANCH_NAME,
  ZERO_HQ_BRANCH_TYPE
} from './seed-data/zero-hq.js'

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI is required (ใช้กับ --env-file=.env)')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

const { ouId, branchId } = await ensureZeroHqBranch(db)
await client.close()

console.log('Zero HQ upserted in zero-platform.platform_branches')
console.log('  ou_id:     ', ouId.toHexString())
console.log('  branch_id: ', branchId.toHexString())
console.log('  code:      ', ZERO_HQ_BRANCH_CODE)
console.log('  name:      ', ZERO_HQ_BRANCH_NAME)
console.log('  type:      ', ZERO_HQ_BRANCH_TYPE)
console.log('')
console.log('Next: npm run seed:example')
