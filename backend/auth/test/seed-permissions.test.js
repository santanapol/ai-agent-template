/**
 * Seed script: validation (fail ทันทีเมื่อข้อมูลผิด) + sync idempotent + --prune
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient } from 'mongodb'
import { syncPermissions } from '../scripts/seed-permissions.js'
import { validateSeedData } from '../src/lib/permission-validation.js'
import { seedMenus, seedRolePermissions } from '../scripts/seed-data/permissions.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

function menu(key, type, parent_key, overrides = {}) {
  return { key, label: key, type, parent_key, sort_order: 10, ou_id: null, ...overrides }
}

const VALID = {
  menus: [
    menu('staff', 'menu', null),
    menu('staff:profiles', 'menu', 'staff'),
    menu('profiles:list', 'action', 'staff:profiles'),
    menu('profiles:create', 'action', 'staff:profiles')
  ],
  rolePermissions: [
    { ou_id: null, role: 'branch_admin', menu_keys: ['profiles:*'] },
    { ou_id: null, role: 'support', menu_keys: ['profiles:list'] }
  ]
}

test('validateSeedData accepts valid data', () => {
  assert.deepEqual(validateSeedData(VALID), [])
})

test('the shipped seed data passes validation', () => {
  assert.deepEqual(validateSeedData({ menus: seedMenus, rolePermissions: seedRolePermissions }), [])
})

test('rejects duplicate menu keys', () => {
  const errors = validateSeedData({
    menus: [...VALID.menus, menu('profiles:list', 'action', 'staff:profiles')],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => e.includes('profiles:list') && /duplicate/i.test(e)))
})

test('rejects invalid menu type', () => {
  const errors = validateSeedData({
    menus: [menu('staff', 'folder', null)],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => e.includes('staff') && /type/i.test(e)))
})

test('rejects parent_key pointing to a missing key', () => {
  const errors = validateSeedData({
    menus: [menu('profiles:list', 'action', 'ghost')],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => e.includes('ghost')))
})

test('rejects parent_key pointing to an action (action must be leaf)', () => {
  const errors = validateSeedData({
    menus: [
      menu('staff', 'menu', null),
      menu('profiles:list', 'action', 'staff'),
      menu('profiles:create', 'action', 'profiles:list')
    ],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => e.includes('profiles:list') && /menu/i.test(e)))
})

test('rejects parent cycles', () => {
  const errors = validateSeedData({
    menus: [menu('a', 'menu', 'b'), menu('b', 'menu', 'a')],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => /cycle/i.test(e)))
})

test('rejects hierarchy deeper than 3 levels', () => {
  const errors = validateSeedData({
    menus: [
      menu('l1', 'menu', null),
      menu('l2', 'menu', 'l1'),
      menu('l3', 'menu', 'l2'),
      menu('deep:action', 'action', 'l3')
    ],
    rolePermissions: []
  })
  assert.ok(errors.some((e) => /depth|ระดับ/i.test(e)))
})

test('rejects exact menu_keys entry that matches no action', () => {
  const errors = validateSeedData({
    menus: VALID.menus,
    rolePermissions: [{ ou_id: null, role: 'support', menu_keys: ['profiles:ghost'] }]
  })
  assert.ok(errors.some((e) => e.includes('profiles:ghost')))
})

test('rejects wildcard matching zero actions (likely a typo)', () => {
  const errors = validateSeedData({
    menus: VALID.menus,
    rolePermissions: [{ ou_id: null, role: 'support', menu_keys: ['invoce:*'] }]
  })
  assert.ok(errors.some((e) => e.includes('invoce:*')))
})

test('rejects menu_keys referencing a menu-type key (menu nodes are not permissions)', () => {
  const errors = validateSeedData({
    menus: VALID.menus,
    rolePermissions: [{ ou_id: null, role: 'support', menu_keys: ['staff:profiles'] }]
  })
  assert.ok(errors.some((e) => e.includes('staff:profiles')))
})

test('rejects duplicate (ou_id, role) pairs', () => {
  const errors = validateSeedData({
    menus: VALID.menus,
    rolePermissions: [
      { ou_id: null, role: 'support', menu_keys: ['profiles:list'] },
      { ou_id: null, role: 'support', menu_keys: ['profiles:create'] }
    ]
  })
  assert.ok(errors.some((e) => e.includes('support') && /duplicate/i.test(e)))
})

test('seed sync + prune against Mongo', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  t.after(() => stop())
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  t.after(() => client.close())
  await client.connect()
  const db = client.db()
  const menusCol = db.collection(AUTH_COLLECTIONS.MENUS)
  const rolesCol = db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS)

  await t.test('running twice is idempotent and preserves cr_* audit fields', async () => {
    await syncPermissions(db, { ...VALID, prune: false, now: new Date('2026-06-01T00:00:00Z') })
    const firstCount = await menusCol.countDocuments()
    const firstDoc = await menusCol.findOne({ key: 'profiles:list' })

    await syncPermissions(db, { ...VALID, prune: false, now: new Date('2026-06-02T00:00:00Z') })
    assert.equal(await menusCol.countDocuments(), firstCount)
    const secondDoc = await menusCol.findOne({ key: 'profiles:list' })
    assert.deepEqual(secondDoc.cr_date, firstDoc.cr_date)
    assert.ok(secondDoc.upd_date > firstDoc.upd_date)
    assert.equal(secondDoc.cr_by, 'system')
    assert.equal(await rolesCol.countDocuments(), 2)
  })

  await t.test('unique indexes are created by the sync', async () => {
    const menuIndexes = await menusCol.indexes()
    assert.ok(menuIndexes.some((i) => i.name === 'uniq_menu_key' && i.unique))
    const roleIndexes = await rolesCol.indexes()
    assert.ok(roleIndexes.some((i) => i.name === 'uniq_ou_role' && i.unique))
  })

  await t.test('without --prune extra documents survive', async () => {
    await menusCol.insertOne(menu('orphan:action', 'action', null))
    await syncPermissions(db, { ...VALID, prune: false, now: new Date() })
    assert.ok(await menusCol.findOne({ key: 'orphan:action' }))
  })

  await t.test('with --prune extra documents are removed and reported', async () => {
    await rolesCol.insertOne({ ou_id: null, role: 'ghost_role', menu_keys: [] })
    const result = await syncPermissions(db, { ...VALID, prune: true, now: new Date() })
    assert.equal(await menusCol.findOne({ key: 'orphan:action' }), null)
    assert.equal(await rolesCol.findOne({ role: 'ghost_role' }), null)
    assert.deepEqual(result.prunedMenuKeys, ['orphan:action'])
    assert.deepEqual(result.prunedRolePairs, ['null|ghost_role'])
  })
})
