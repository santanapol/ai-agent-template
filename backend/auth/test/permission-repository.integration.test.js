/**
 * Repository queries + indexes ของ dynamic permission (auth_menus, auth_role_permissions).
 * ใช้ MongoMemoryReplSet เหมือน integration tests อื่น
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MongoClient, ObjectId } from 'mongodb'
import { AuthRepository } from '../src/modules/auth/auth.repository.js'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { ensureAuthIndexes } from './helpers/ensure-indexes.mjs'
import { startMongoForTests, resetDatabase } from './helpers/mongo-test-server.mjs'

const OU_A = new ObjectId()
const OU_B = new ObjectId()

function menuDoc(overrides) {
  const now = new Date()
  return {
    label: 'เมนูทดสอบ',
    type: 'action',
    parent_key: null,
    sort_order: 10,
    ou_id: null,
    cr_by: 'system',
    cr_date: now,
    cr_prog: 'test',
    upd_by: 'system',
    upd_date: now,
    upd_prog: 'test',
    ...overrides
  }
}

test('permission repository + Mongo integration', { timeout: 180_000 }, async (t) => {
  const { databaseUri, stop } = await startMongoForTests()
  t.after(() => stop())
  await resetDatabase(databaseUri)

  const client = new MongoClient(databaseUri)
  t.after(() => client.close())
  await client.connect()
  const db = client.db()
  await ensureAuthIndexes(db)
  const repo = new AuthRepository(db)

  await db
    .collection(AUTH_COLLECTIONS.MENUS)
    .insertMany([
      menuDoc({ key: 'staff', label: 'จัดการพนักงาน', type: 'menu' }),
      menuDoc({ key: 'profiles:list', parent_key: 'staff', sort_order: 10 }),
      menuDoc({ key: 'profiles:create', parent_key: 'staff', sort_order: 20 }),
      menuDoc({ key: 'oua:special', parent_key: 'staff', sort_order: 30, ou_id: OU_A })
    ])
  await db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS).insertMany([
    {
      ou_id: null,
      role: 'branch_admin',
      menu_keys: ['profiles:*'],
      upd_by: 'system',
      upd_date: new Date()
    },
    {
      ou_id: OU_A,
      role: 'branch_admin',
      menu_keys: ['profiles:list'],
      upd_by: 'system',
      upd_date: new Date()
    }
  ])

  await t.test('findRolePermissions returns the (ou_id, role) document', async () => {
    const doc = await repo.findRolePermissions(OU_A, 'branch_admin')
    assert.ok(doc)
    assert.deepEqual(doc.menu_keys, ['profiles:list'])
  })

  await t.test('findRolePermissions with ou_id null returns the global default', async () => {
    const doc = await repo.findRolePermissions(null, 'branch_admin')
    assert.ok(doc)
    assert.deepEqual(doc.menu_keys, ['profiles:*'])
  })

  await t.test('findRolePermissions returns null when the pair has no document', async () => {
    assert.equal(await repo.findRolePermissions(OU_B, 'branch_admin'), null)
    assert.equal(await repo.findRolePermissions(OU_A, 'support'), null)
  })

  await t.test('findActionMenusForOu returns global + own-OU actions only', async () => {
    const keys = (await repo.findActionMenusForOu(OU_A)).map((m) => m.key).sort()
    assert.deepEqual(keys, ['oua:special', 'profiles:create', 'profiles:list'])
  })

  await t.test('findActionMenusForOu excludes other-OU actions and menu nodes', async () => {
    const keys = (await repo.findActionMenusForOu(OU_B)).map((m) => m.key).sort()
    assert.deepEqual(keys, ['profiles:create', 'profiles:list'])
  })

  await t.test('findMenusByKeys returns docs scoped to global + own OU', async () => {
    const menus = await repo.findMenusByKeys(['staff', 'oua:special'], OU_B)
    assert.deepEqual(
      menus.map((m) => m.key),
      ['staff']
    )
  })

  await t.test('auth_menus.key unique index rejects duplicates', async () => {
    await assert.rejects(
      db.collection(AUTH_COLLECTIONS.MENUS).insertOne(menuDoc({ key: 'profiles:list' })),
      /duplicate key/i
    )
  })

  await t.test('auth_role_permissions (ou_id, role) unique index rejects duplicates', async () => {
    await assert.rejects(
      db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS).insertOne({
        ou_id: null,
        role: 'branch_admin',
        menu_keys: [],
        upd_by: 'system',
        upd_date: new Date()
      }),
      /duplicate key/i
    )
  })
})
