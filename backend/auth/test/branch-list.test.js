import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { sortBranchDisplayList } from '../src/modules/auth/branch-display-sort.js'
import { BranchAccessResolver } from '../src/modules/auth/branch-access.resolver.js'
import { ZERO_HQ_BRANCH_ID } from '../scripts/seed-data/zero-hq.js'

test('sortBranchDisplayList pins Zero HQ first and inactive branches last', () => {
  const sorted = sortBranchDisplayList([
    {
      branch_id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      branch_code: 'B2',
      branch_name: 'Beta',
      active: true
    },
    {
      branch_id: ZERO_HQ_BRANCH_ID,
      branch_code: 'ZERO',
      branch_name: 'Zero HQ',
      active: true
    },
    {
      branch_id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      branch_code: 'A1',
      branch_name: 'Alpha',
      active: false
    }
  ])

  assert.equal(sorted[0]?.branch_id, ZERO_HQ_BRANCH_ID)
  assert.equal(sorted[1]?.branch_code, 'B2')
  assert.equal(sorted[2]?.active, false)
})

test('BranchAccessResolver.listBranchesForOu merges platform and customer branches', async () => {
  const ouId = new ObjectId()
  const customerBranchId = new ObjectId()
  const platformBranchId = new ObjectId(ZERO_HQ_BRANCH_ID)

  const platformBranchRepo = {
    async findByOuId() {
      return [
        {
          _id: platformBranchId,
          ou_id: ouId,
          branch_code: 'ZERO',
          branch_name: 'Zero HQ',
          active: true
        }
      ]
    }
  }

  const branchReadRepo = {
    async findByOuId() {
      return [
        {
          _id: customerBranchId,
          ou_id: ouId,
          branch_code: '7W',
          branch_name: '777WW',
          active: true
        }
      ]
    }
  }

  const resolver = new BranchAccessResolver({ platformBranchRepo, branchReadRepo })
  const branches = await resolver.listBranchesForOu(ouId)

  assert.equal(branches.length, 2)
  assert.equal(branches[0]?.branch_id, ZERO_HQ_BRANCH_ID)
  assert.equal(branches[1]?.branch_code, '7W')
})
