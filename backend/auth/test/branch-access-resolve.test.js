import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { resolveBranchAccessFromDoc } from '../src/modules/auth/branch-access-resolve.js'

test('resolveBranchAccessFromDoc returns not_found when branch missing', () => {
  assert.equal(resolveBranchAccessFromDoc(null, new ObjectId()), 'not_found')
})

test('resolveBranchAccessFromDoc returns forbidden for cross-OU branch', () => {
  const ouId = new ObjectId()
  const branch = { _id: new ObjectId(), ou_id: new ObjectId(), active: true }
  assert.equal(resolveBranchAccessFromDoc(branch, ouId), 'forbidden')
})

test('resolveBranchAccessFromDoc returns inactive when active is false', () => {
  const ouId = new ObjectId()
  const branch = { _id: new ObjectId(), ou_id: ouId, active: false }
  assert.equal(resolveBranchAccessFromDoc(branch, ouId), 'inactive')
})

test('resolveBranchAccessFromDoc returns ok for active branch in OU', () => {
  const ouId = new ObjectId()
  const branch = { _id: new ObjectId(), ou_id: ouId, active: true }
  assert.equal(resolveBranchAccessFromDoc(branch, ouId), 'ok')
})
