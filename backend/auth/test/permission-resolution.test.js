import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { AuthService } from '../src/modules/auth/auth.service.js'

const OU_A = new ObjectId()
const OU_B = new ObjectId()

/** Fake repo เก็บ mapping ใน memory — คีย์เป็น `${ouHexOrNull}|${role}` */
function fakeRepoWith(docs) {
  const byPair = new Map(
    docs.map((d) => [`${d.ou_id === null ? 'null' : d.ou_id.toHexString()}|${d.role}`, d])
  )
  return {
    findRolePermissions: async (ouId, role) =>
      byPair.get(`${ouId === null ? 'null' : ouId.toHexString()}|${role}`) ?? null
  }
}

function serviceWith(repo) {
  return new AuthService({
    env: {},
    repo,
    mongoClient: null,
    privateKey: null,
    types: {}
  })
}

test('returns the (ou_id, role) document keys without touching global', async () => {
  const service = serviceWith(
    fakeRepoWith([
      { ou_id: OU_A, role: 'branch_admin', menu_keys: ['profiles:list'] },
      { ou_id: null, role: 'branch_admin', menu_keys: ['profiles:*'] }
    ])
  )
  assert.deepEqual(
    await service.resolveEffectivePermissions({ ouId: OU_A, role: 'branch_admin' }),
    ['profiles:list']
  )
})

test('falls back to the global default when the pair has no document', async () => {
  const service = serviceWith(
    fakeRepoWith([{ ou_id: null, role: 'branch_admin', menu_keys: ['profiles:*'] }])
  )
  assert.deepEqual(
    await service.resolveEffectivePermissions({ ouId: OU_B, role: 'branch_admin' }),
    ['profiles:*']
  )
})

test('OU override of another role does not affect this role', async () => {
  const service = serviceWith(
    fakeRepoWith([
      { ou_id: OU_A, role: 'branch_admin', menu_keys: ['profiles:list'] },
      { ou_id: null, role: 'support', menu_keys: ['profiles:lookup'] }
    ])
  )
  assert.deepEqual(await service.resolveEffectivePermissions({ ouId: OU_A, role: 'support' }), [
    'profiles:lookup'
  ])
})

test('explicit empty menu_keys is an override — no fallback to global', async () => {
  const service = serviceWith(
    fakeRepoWith([
      { ou_id: OU_A, role: 'support', menu_keys: [] },
      { ou_id: null, role: 'support', menu_keys: ['profiles:lookup'] }
    ])
  )
  assert.deepEqual(await service.resolveEffectivePermissions({ ouId: OU_A, role: 'support' }), [])
})

test('returns empty array when neither pair nor global exists (deny by default)', async () => {
  const service = serviceWith(fakeRepoWith([]))
  assert.deepEqual(
    await service.resolveEffectivePermissions({ ouId: OU_A, role: 'branch_admin' }),
    []
  )
})

test('returns empty array when the document has malformed menu_keys', async () => {
  const service = serviceWith(
    fakeRepoWith([{ ou_id: OU_A, role: 'support', menu_keys: 'not-an-array' }])
  )
  assert.deepEqual(await service.resolveEffectivePermissions({ ouId: OU_A, role: 'support' }), [])
})

test('repository errors propagate — never swallowed into an empty array', async () => {
  const service = serviceWith({
    findRolePermissions: async () => {
      throw new Error('mongo down')
    }
  })
  await assert.rejects(
    service.resolveEffectivePermissions({ ouId: OU_A, role: 'branch_admin' }),
    /mongo down/
  )
})
