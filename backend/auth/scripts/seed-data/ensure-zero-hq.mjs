import { ObjectId } from 'mongodb'
import { AUTH_COLLECTIONS } from '../../src/config/mongo-collections.js'
import {
  DEV_SEED_OU_ID,
  ZERO_HQ_BRANCH_CODE,
  ZERO_HQ_BRANCH_ID,
  ZERO_HQ_BRANCH_NAME,
  ZERO_HQ_BRANCH_TYPE
} from './zero-hq.js'

const SEED_PROG = 'scripts/seed-data/ensure-zero-hq.mjs'

/**
 * Indexes for platform_branches (zero-platform SoT).
 * @param {import('mongodb').Db} db
 */
export async function ensurePlatformBranchIndexes(db) {
  await db
    .collection(AUTH_COLLECTIONS.PLATFORM_BRANCHES)
    .createIndex({ ou_id: 1, branch_code: 1 }, { unique: true, name: 'uniq_ou_branch_code' })
  await db
    .collection(AUTH_COLLECTIONS.PLATFORM_BRANCHES)
    .createIndex({ ou_id: 1, active: 1 }, { name: 'by_ou_active' })
}

/**
 * Upsert Zero HQ in zero-platform.platform_branches (not gpp_777ww).
 * @param {import('mongodb').Db} db
 * @param {{ ouId?: import('mongodb').ObjectId, branchId?: import('mongodb').ObjectId }} [opts]
 */
export async function ensureZeroHqBranch(db, opts = {}) {
  await ensurePlatformBranchIndexes(db)

  const ouId = opts.ouId ?? new ObjectId(process.env.SEED_OU_ID ?? DEV_SEED_OU_ID)
  const branchId = opts.branchId ?? new ObjectId(process.env.ZERO_HQ_BRANCH_ID ?? ZERO_HQ_BRANCH_ID)
  const now = new Date()

  await db.collection(AUTH_COLLECTIONS.PLATFORM_BRANCHES).updateOne(
    { _id: branchId },
    {
      $set: {
        ou_id: ouId,
        branch_type: ZERO_HQ_BRANCH_TYPE,
        branch_name: ZERO_HQ_BRANCH_NAME,
        branch_code: ZERO_HQ_BRANCH_CODE,
        branch_desc: 'Zero Platform internal operations HQ',
        active: true,
        upd_by: 'zero-platform',
        upd_date: now,
        upd_prog: SEED_PROG
      },
      $setOnInsert: {
        cr_by: 'zero-platform',
        cr_date: now,
        cr_prog: SEED_PROG
      }
    },
    { upsert: true }
  )

  const branchDoc = await db
    .collection(AUTH_COLLECTIONS.PLATFORM_BRANCHES)
    .findOne({ _id: branchId })

  return { ouId, branchId, branchDoc }
}
