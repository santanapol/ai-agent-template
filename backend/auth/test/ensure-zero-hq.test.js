import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureZeroHqBranch } from '../scripts/seed-data/ensure-zero-hq.mjs'
import { ZERO_HQ_BRANCH_ID } from '../scripts/seed-data/zero-hq.js'

test('ensureZeroHqBranch preserves cr_* audit fields on re-run', async () => {
  const branchId = new ObjectId(ZERO_HQ_BRANCH_ID)
  const ouId = new ObjectId()
  /** @type {import('mongodb').Document | null} */
  let stored = null

  const db = {
    collection: () => ({
      createIndex: async () => {},
      updateOne: async (_filter, update) => {
        if (!stored) {
          stored = {
            _id: branchId,
            ...update.$setOnInsert,
            ...update.$set
          }
          return { upsertedCount: 1 }
        }
        stored = { ...stored, ...update.$set }
        return { upsertedCount: 0 }
      },
      findOne: async () => stored
    })
  }

  await ensureZeroHqBranch(db, { ouId, branchId })
  const firstCrDate = stored.cr_date
  const firstCrBy = stored.cr_by
  assert.equal(firstCrBy, 'zero-platform')
  assert.ok(firstCrDate instanceof Date)

  await ensureZeroHqBranch(db, { ouId, branchId })

  assert.equal(stored.cr_by, firstCrBy)
  assert.equal(stored.cr_date.getTime(), firstCrDate.getTime())
  assert.equal(stored.upd_by, 'zero-platform')
  assert.equal(stored.branch_name, 'Zero HQ')
})

test('ensureZeroHqBranch uses platform_branches collection name', async () => {
  let collectionName = ''
  const db = {
    collection: (name) => {
      collectionName = name
      return {
        createIndex: async () => {},
        updateOne: async () => ({ upsertedCount: 1 }),
        findOne: async () => ({ _id: new ObjectId(ZERO_HQ_BRANCH_ID) })
      }
    }
  }

  await ensureZeroHqBranch(db, {
    ouId: new ObjectId(),
    branchId: new ObjectId(ZERO_HQ_BRANCH_ID)
  })

  assert.equal(collectionName, AUTH_COLLECTIONS.PLATFORM_BRANCHES)
})
