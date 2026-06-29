#!/usr/bin/env node
/**
 * Migrate OU-wide roles (platform_admin, support_admin, support) to Zero HQ home branch.
 *
 *   npm run migrate:ou-wide-home-branch -- --dry-run
 *   npm run migrate:ou-wide-home-branch -- --execute
 *
 * Production:
 *   node --env-file=.env.prod scripts/migrate-ou-wide-home-branch.mjs --dry-run
 *   node --env-file=.env.prod scripts/migrate-ou-wide-home-branch.mjs --execute
 *
 * Env: DATABASE_URI (required), SEED_OU_ID (optional OU filter), ZERO_HQ_BRANCH_ID (optional)
 */
import { MongoClient, ObjectId } from 'mongodb'
import { OU_WIDE_STAFF_ROLES } from '@zero-platform/roles'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureZeroHqBranch } from './seed-data/ensure-zero-hq.mjs'
import { DEV_SEED_OU_ID, ZERO_HQ_BRANCH_ID } from './seed-data/zero-hq.js'

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI is required')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const execute = process.argv.includes('--execute')
if (!dryRun && !execute) {
  console.error('Pass --dry-run (preview) or --execute (apply changes)')
  process.exit(1)
}
if (dryRun && execute) {
  console.error('Use only one of --dry-run or --execute')
  process.exit(1)
}

const ouId = process.env.SEED_OU_ID
  ? new ObjectId(process.env.SEED_OU_ID)
  : new ObjectId(DEV_SEED_OU_ID)
const hqBranchId = process.env.ZERO_HQ_BRANCH_ID
  ? new ObjectId(process.env.ZERO_HQ_BRANCH_ID)
  : new ObjectId(ZERO_HQ_BRANCH_ID)

const MIGRATE_PROG = 'scripts/migrate-ou-wide-home-branch.mjs'
const ouWideRoles = [...OU_WIDE_STAFF_ROLES]

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

console.log(`Database: ${db.databaseName}`)
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`)
console.log(`OU filter: ${ouId.toHexString()}`)
console.log(`Zero HQ branch_id: ${hqBranchId.toHexString()}`)
console.log(`Roles: ${ouWideRoles.join(', ')}`)
console.log('')

if (!dryRun) {
  await ensureZeroHqBranch(db, { ouId, branchId: hqBranchId })
  console.log('✔ Zero HQ upserted in platform_branches')
} else {
  console.log('(dry-run) Would upsert Zero HQ in platform_branches')
}

const userFilter = {
  ou_id: ouId,
  role: { $in: ouWideRoles },
  branch_id: { $ne: hqBranchId }
}

const users = await db
  .collection(AUTH_COLLECTIONS.USERS)
  .find(userFilter, { projection: { username: 1, role: 1, branch_id: 1 } })
  .toArray()

console.log('')
console.log(`auth_users to update: ${users.length}`)
for (const user of users) {
  const from = user.branch_id?.toHexString?.() ?? String(user.branch_id)
  console.log(`  - ${user.username} (${user.role}): ${from} → ${hqBranchId.toHexString()}`)
}

const userIds = users.map((user) => user._id)
const profileFilter = {
  ou_id: ouId,
  user_id: { $in: userIds.length ? userIds : [new ObjectId()] },
  branch_id: { $ne: hqBranchId }
}
const profiles = await db
  .collection('staff_profiles')
  .find(profileFilter, { projection: { code: 1, user_id: 1, branch_id: 1 } })
  .toArray()

console.log('')
console.log(`staff_profiles to update: ${profiles.length}`)
for (const profile of profiles) {
  const from = profile.branch_id?.toHexString?.() ?? String(profile.branch_id)
  console.log(
    `  - ${profile.code ?? profile.user_id?.toHexString?.()}: ${from} → ${hqBranchId.toHexString()}`
  )
}

if (dryRun) {
  await client.close()
  console.log('')
  console.log('Dry run complete — no changes written. Re-run with --execute to apply.')
  process.exit(0)
}

const now = new Date()
const userResult = await db.collection(AUTH_COLLECTIONS.USERS).updateMany(userFilter, {
  $set: {
    branch_id: hqBranchId,
    upd_by: 'migrate_ou_wide_home',
    upd_date: now,
    upd_prog: MIGRATE_PROG
  }
})

const profileResult = await db.collection('staff_profiles').updateMany(
  {
    ou_id: ouId,
    user_id: { $in: userIds },
    branch_id: { $ne: hqBranchId }
  },
  {
    $set: {
      branch_id: hqBranchId,
      upd_by: 'migrate_ou_wide_home',
      upd_date: now,
      upd_prog: MIGRATE_PROG
    }
  }
)

await client.close()

console.log('')
console.log(`✔ auth_users updated: ${userResult.modifiedCount}`)
console.log(`✔ staff_profiles updated: ${profileResult.modifiedCount}`)
console.log('')
console.log('Users must sign in again (or refresh session) to pick up branch_id in JWT.')
