import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { BranchReadRepository } from '../src/modules/auth/branch-read.repository.js'

test('BranchReadRepository.resolveBranchAccess distinguishes not_found vs forbidden', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const otherOu = new ObjectId()

  const docs = [
    { _id: branchId, ou_id: ouId, branch_name: 'Main', branch_code: 'M01', active: true },
    { _id: new ObjectId(), ou_id: otherOu, branch_name: 'Other', branch_code: 'O01', active: true }
  ]

  const db = {
    collection: () => ({
      findOne: async (filter) => docs.find((d) => d._id.equals(filter._id)) ?? null
    })
  }

  const repo = new BranchReadRepository(db)

  assert.equal(await repo.resolveBranchAccess(branchId, ouId), 'ok')
  assert.equal(await repo.resolveBranchAccess(branchId, otherOu), 'forbidden')
  assert.equal(await repo.resolveBranchAccess(new ObjectId(), ouId), 'not_found')
})

test('BranchReadRepository.resolveBranchAccess returns inactive for deactivated branch', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const doc = {
    _id: branchId,
    ou_id: ouId,
    branch_name: 'Closed',
    branch_code: 'C01',
    active: false
  }

  const db = {
    collection: () => ({
      findOne: async (filter) => (filter._id.equals(branchId) ? doc : null)
    })
  }

  const repo = new BranchReadRepository(db)
  assert.equal(await repo.resolveBranchAccess(branchId, ouId), 'inactive')
})

test('BranchReadRepository.findByIdInOu matches _id and ou_id', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const otherOu = new ObjectId()

  const docs = [
    { _id: branchId, ou_id: ouId, branch_name: 'Main', branch_code: 'M01', active: true },
    { _id: new ObjectId(), ou_id: otherOu, branch_name: 'Other', branch_code: 'O01', active: true }
  ]

  const db = {
    collection: () => ({
      findOne: async (filter) =>
        docs.find(
          (d) => d._id.equals(filter._id) && (!filter.ou_id || d.ou_id.equals(filter.ou_id))
        ) ?? null
    })
  }

  const repo = new BranchReadRepository(db)

  const hit = await repo.findByIdInOu(branchId, ouId)
  assert.ok(hit)
  assert.equal(hit.branch_code, 'M01')

  const missOu = await repo.findByIdInOu(branchId, otherOu)
  assert.equal(missOu, null)

  const missId = await repo.findByIdInOu(new ObjectId(), ouId)
  assert.equal(missId, null)
})

test('BranchReadRepository.findById returns branch regardless of ou', async () => {
  const branchId = new ObjectId()
  const ouId = new ObjectId()
  const doc = { _id: branchId, ou_id: ouId, branch_name: 'Solo', branch_code: 'S01', active: false }

  const db = {
    collection: () => ({
      findOne: async (filter) => (filter._id.equals(branchId) ? doc : null)
    })
  }

  const repo = new BranchReadRepository(db)
  const found = await repo.findById(branchId)
  assert.equal(found.branch_name, 'Solo')
  assert.equal(found.active, false)
})
