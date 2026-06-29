import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { PlatformBranchRepository } from '../src/modules/auth/platform-branch.repository.js'
import { BranchAccessResolver } from '../src/modules/auth/branch-access.resolver.js'
import { BranchReadRepository } from '../src/modules/auth/branch-read.repository.js'

test('PlatformBranchRepository.resolveBranchAccess returns inactive for deactivated branch', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()

  const db = {
    collection: () => ({
      findOne: async (filter) =>
        filter._id.equals(branchId)
          ? {
              _id: branchId,
              ou_id: ouId,
              branch_name: 'Zero HQ',
              branch_code: 'ZERO',
              active: false
            }
          : null
    })
  }

  const repo = new PlatformBranchRepository(db)
  assert.equal(await repo.resolveBranchAccess(branchId, ouId), 'inactive')
})

test('PlatformBranchRepository.findByIdInOu matches _id and ou_id', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const otherOu = new ObjectId()

  const docs = [
    { _id: branchId, ou_id: ouId, branch_name: 'Zero HQ', branch_code: 'ZERO', active: true },
    { _id: new ObjectId(), ou_id: otherOu, branch_name: 'Other', branch_code: 'OTH', active: true }
  ]

  const db = {
    collection: () => ({
      findOne: async (filter) =>
        docs.find(
          (doc) => doc._id.equals(filter._id) && (!filter.ou_id || doc.ou_id.equals(filter.ou_id))
        ) ?? null
    })
  }

  const repo = new PlatformBranchRepository(db)

  const hit = await repo.findByIdInOu(branchId, ouId)
  assert.ok(hit)
  assert.equal(hit.branch_code, 'ZERO')

  assert.equal(await repo.findByIdInOu(branchId, otherOu), null)
})

test('PlatformBranchRepository.resolveBranchAccess', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()
  const otherOu = new ObjectId()

  const docs = [
    { _id: branchId, ou_id: ouId, branch_name: 'Zero HQ', branch_code: 'ZERO', active: true },
    { _id: new ObjectId(), ou_id: otherOu, branch_name: 'Other', branch_code: 'OTH', active: true }
  ]

  const db = {
    collection: () => ({
      findOne: async (filter) => docs.find((d) => d._id.equals(filter._id)) ?? null
    })
  }

  const repo = new PlatformBranchRepository(db)

  assert.equal(await repo.resolveBranchAccess(branchId, ouId), 'ok')
  assert.equal(await repo.resolveBranchAccess(branchId, otherOu), 'forbidden')
  assert.equal(await repo.resolveBranchAccess(new ObjectId(), ouId), 'not_found')
})

test('BranchAccessResolver prefers platform_branches over su_branch', async () => {
  const ouId = new ObjectId()
  const platformBranchId = new ObjectId()
  const customerBranchId = new ObjectId()

  const platformRepo = {
    async resolveBranchAccess(branchId, expectedOu) {
      if (branchId.equals(platformBranchId) && expectedOu.equals(ouId)) return 'ok'
      return 'not_found'
    }
  }

  const branchReadRepo = {
    async resolveBranchAccess(branchId, expectedOu) {
      if (branchId.equals(customerBranchId) && expectedOu.equals(ouId)) return 'ok'
      return 'not_found'
    }
  }

  const resolver = new BranchAccessResolver({
    platformBranchRepo: platformRepo,
    branchReadRepo
  })

  assert.equal(await resolver.resolveBranchAccess(platformBranchId, ouId), 'ok')
  assert.equal(await resolver.resolveBranchAccess(customerBranchId, ouId), 'ok')
  assert.equal(resolver.isConfigured(), true)
})

test('BranchAccessResolver falls back to BranchReadRepository', async () => {
  const ouId = new ObjectId()
  const branchId = new ObjectId()

  const db = {
    collection: () => ({
      findOne: async (filter) =>
        filter._id.equals(branchId)
          ? {
              _id: branchId,
              ou_id: ouId,
              branch_name: 'Customer',
              branch_code: 'C01',
              active: true
            }
          : null
    })
  }

  const resolver = new BranchAccessResolver({
    platformBranchRepo: new PlatformBranchRepository({
      collection: () => ({ findOne: async () => null })
    }),
    branchReadRepo: new BranchReadRepository(db)
  })

  assert.equal(await resolver.resolveBranchAccess(branchId, ouId), 'ok')
})
