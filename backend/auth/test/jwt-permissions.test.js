/**
 * issueAccess ฝังเคลม permissions (ค่าดิบ ไม่ expand wildcard) + JWT size guard
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { decodeJwt } from 'jose'
import { AuthService } from '../src/modules/auth/auth.service.js'
import { loadSigningMaterial } from '../src/lib/jwt-access.js'
import { generateRsaPkcs8Pem } from './helpers/rsa-pem.mjs'

const { privateKey } = await loadSigningMaterial(generateRsaPkcs8Pem())

function makeUser() {
  return {
    _id: new ObjectId(),
    ou_id: new ObjectId(),
    branch_id: new ObjectId(),
    role: 'branch_admin',
    access_token_gen: 0
  }
}

function makeService({ menuKeys, softLimitBytes, log = null }) {
  return new AuthService({
    env: {
      JWT_KID: 'default',
      JWT_CLAIM_ROLE: 'role',
      JWT_ISSUER: '',
      JWT_AUDIENCE: '',
      ACCESS_TOKEN_TTL_SECONDS: 900,
      ...(softLimitBytes === undefined ? {} : { ACCESS_JWT_SOFT_LIMIT_BYTES: softLimitBytes })
    },
    repo: {
      findRolePermissions: async () => (menuKeys === null ? null : { menu_keys: menuKeys })
    },
    mongoClient: null,
    privateKey,
    types: {},
    log
  })
}

function warnCollector() {
  const calls = []
  return {
    calls,
    log: { warn: (obj, msg) => calls.push({ obj, msg }) }
  }
}

test('issueAccess embeds home_branch_id matching user home branch', async () => {
  const service = makeService({ menuKeys: ['profiles:*'] })
  const user = makeUser()
  const homeHex = user.branch_id.toHexString()
  const { access_token } = await service.issueAccess(user)

  const claims = decodeJwt(access_token)
  assert.equal(claims.branch_id, homeHex)
  assert.equal(claims.home_branch_id, homeHex)
})

test('issueAccess uses activeBranchId for branch_id while home_branch_id stays home', async () => {
  const service = makeService({ menuKeys: ['profiles:*'] })
  const user = makeUser()
  const homeHex = user.branch_id.toHexString()
  const activeHex = new ObjectId().toHexString()
  const { access_token } = await service.issueAccess(user, { activeBranchId: activeHex })

  const claims = decodeJwt(access_token)
  assert.equal(claims.branch_id, activeHex)
  assert.equal(claims.home_branch_id, homeHex)
})

test('issueAccess embeds raw permissions claim and returns the same entries', async () => {
  const service = makeService({ menuKeys: ['profiles:*', 'invoice:read'] })
  const { access_token, permissions } = await service.issueAccess(makeUser())

  assert.deepEqual(permissions, ['profiles:*', 'invoice:read'])
  const claims = decodeJwt(access_token)
  assert.deepEqual(claims.permissions, ['profiles:*', 'invoice:read'])
})

test('issueAccess yields empty permissions when no mapping exists', async () => {
  const service = makeService({ menuKeys: null })
  const { access_token, permissions } = await service.issueAccess(makeUser())

  assert.deepEqual(permissions, [])
  assert.deepEqual(decodeJwt(access_token).permissions, [])
})

test('warns when the signed token exceeds the soft size limit', async () => {
  const { calls, log } = warnCollector()
  const service = makeService({ menuKeys: ['profiles:*'], softLimitBytes: 10, log })
  await service.issueAccess(makeUser())

  assert.equal(calls.length, 1)
  assert.equal(calls[0].obj.permission_entries, 1)
  assert.ok(calls[0].obj.bytes > 10)
})

test('does not warn when the token is within the soft limit', async () => {
  const { calls, log } = warnCollector()
  const service = makeService({ menuKeys: ['profiles:*'], log })
  await service.issueAccess(makeUser())

  assert.equal(calls.length, 0)
})
