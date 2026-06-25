/**
 * active_branch_id on refresh rows — session survival across rotate/refresh
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { decodeJwt } from 'jose'
import { AuthRepository } from '../src/modules/auth/auth.repository.js'
import { AuthService } from '../src/modules/auth/auth.service.js'
import { loadSigningMaterial } from '../src/lib/jwt-access.js'
import { hashRefreshToken } from '../src/lib/refresh-token.js'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'

const { privateKey } = await loadSigningMaterial(generateRsaPkcs8Pem())

function makeUser() {
  return {
    _id: new ObjectId(),
    ou_id: new ObjectId(),
    branch_id: new ObjectId(),
    role: 'platform_admin',
    access_token_gen: 0
  }
}

function makeRefreshRow(user, { activeBranchId = null } = {}) {
  const family_id = new ObjectId()
  const plain = 'refresh-plain-token-value'
  return {
    plain,
    hash: hashRefreshToken(plain),
    row: {
      _id: new ObjectId(),
      user_id: user._id,
      family_id,
      token_hash: hashRefreshToken(plain),
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
      active_branch_id: activeBranchId
    }
  }
}

test('insertRefreshToken stores active_branch_id null by default', async () => {
  let captured = null
  const db = {
    collection: () => ({
      insertOne: async (row) => {
        captured = row
        return { insertedId: new ObjectId() }
      }
    })
  }
  const repo = new AuthRepository(db)
  await repo.insertRefreshToken({
    user_id: new ObjectId(),
    family_id: new ObjectId(),
    token_hash: 'hash',
    expires_at: new Date()
  })

  assert.equal(captured.active_branch_id, null)
})

test('rotateRefreshTokenTxnBody copies active_branch_id to new refresh row', async () => {
  const activeOid = new ObjectId()
  const user = makeUser()
  const { hash, row } = makeRefreshRow(user, { activeBranchId: activeOid })
  const inserted = []

  const repo = {
    findRefreshByTokenHash: async (h) => (h === hash ? row : null),
    insertRefreshToken: async (doc) => {
      inserted.push(doc)
      return new ObjectId()
    },
    revokeRefreshById: async () => {},
    setReplacedBy: async () => {}
  }

  const service = new AuthService({
    env: {},
    repo,
    mongoClient: null,
    privateKey,
    types: {}
  })

  const now = new Date()
  await service.rotateRefreshTokenTxnBody({
    hash,
    now,
    newHash: 'new-hash',
    expires_at: new Date(now.getTime() + 60_000),
    row
  })

  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].active_branch_id, activeOid)
})

test('refresh issues access token with active branch from refresh row', async () => {
  const user = makeUser()
  const homeHex = user.branch_id.toHexString()
  const activeOid = new ObjectId()
  const { plain, hash, row } = makeRefreshRow(user, { activeBranchId: activeOid })

  const repo = {
    findRefreshByTokenHash: async (h) => (h === hash ? row : null),
    findUserById: async () => user,
    insertRefreshToken: async () => new ObjectId(),
    revokeRefreshById: async () => {},
    setReplacedBy: async () => {},
    findRolePermissions: async () => ({ menu_keys: ['dashboard:view'] })
  }

  const service = new AuthService({
    env: {
      JWT_KID: 'default',
      JWT_CLAIM_ROLE: 'role',
      JWT_ISSUER: '',
      JWT_AUDIENCE: '',
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_SECONDS: 2592000,
      REFRESH_COOKIE_NAME: 'refresh_token'
    },
    repo,
    mongoClient: {
      startSession: () => ({
        withTransaction: async (fn) => fn(),
        endSession: () => {}
      })
    },
    privateKey,
    types: { invalidToken: 'https://example.invalid/problems/refresh-rejected' },
    redisClient: null
  })

  const result = await service.refresh({
    rawRefresh: plain,
    refreshChannel: 'native',
    ip: '127.0.0.1',
    request_id: 'req-1'
  })

  assert.equal(result.ok, true)
  const claims = decodeJwt(result.body.access_token)
  assert.equal(claims.branch_id, activeOid.toHexString())
  assert.equal(claims.home_branch_id, homeHex)
})

test('assertAccessTokenGenMatches rejects when Redis key missing (fail-closed)', async () => {
  const user = makeUser()
  const repo = {
    findUserById: async () => user
  }
  const service = new AuthService({
    env: {},
    repo,
    mongoClient: null,
    privateKey,
    types: { invalidToken: 'https://example.invalid/problems/invalid-token' },
    redisClient: {
      async get() {
        return null
      }
    }
  })

  const result = await service.assertAccessTokenGenMatches({
    user_id_hex: user._id.toHexString(),
    token_gen_claim: 0
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 401)
})
