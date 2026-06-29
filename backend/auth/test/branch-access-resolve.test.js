import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { resolveBranchAccessFromDoc } from '../src/modules/auth/branch-access-resolve.js'

test('resolveBranchAccessFromDoc treats active 0 and false as inactive', () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const base = { _id: branchId, ou_id: ouId, branch_name: 'X', branch_code: 'X01' }

  assert.equal(resolveBranchAccessFromDoc({ ...base, active: true }, ouId), 'ok')
  assert.equal(resolveBranchAccessFromDoc({ ...base, active: '1' }, ouId), 'ok')
  assert.equal(resolveBranchAccessFromDoc({ ...base, active: false }, ouId), 'inactive')
  assert.equal(resolveBranchAccessFromDoc({ ...base, active: '0' }, ouId), 'inactive')
  assert.equal(resolveBranchAccessFromDoc({ ...base, active: 0 }, ouId), 'inactive')
})
