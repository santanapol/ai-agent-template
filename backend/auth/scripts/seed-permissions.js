/**
 * Seed/Sync ผังเมนูกลาง (auth_menus) และ role mappings (auth_role_permissions)
 * — idempotent: validate ก่อนเขียนเสมอ (fail ทั้งสคริปต์เมื่อข้อมูลผิดแม้ข้อเดียว)
 *
 *   node --env-file=.env scripts/seed-permissions.js           # upsert อย่างเดียว
 *   node --env-file=.env scripts/seed-permissions.js --prune   # ลบส่วนเกินที่ไม่อยู่ในไฟล์ seed
 */
import { MongoClient } from 'mongodb'
import { AUTH_COLLECTIONS } from '../src/config/mongo-collections.js'
import { isWildcardEntry, anyPermissionMatches } from '../src/lib/permission-match.js'
import { seedMenus, seedRolePermissions } from './seed-data/permissions.js'

const SEED_PROG = 'scripts/seed-permissions.js'
const SEED_BY = 'system'
const MAX_DEPTH = 3
const MENU_TYPES = ['menu', 'action']

function pairKey(doc) {
  return `${doc.ou_id === null ? 'null' : String(doc.ou_id)}|${doc.role}`
}

/**
 * ตรวจข้อมูล seed ตามกฎใน SPEC (Hierarchy Rules + Registry integrity)
 * @returns {string[]} รายการข้อผิดพลาดทั้งหมด (ว่าง = ผ่าน)
 */
export function validateSeedData({ menus, rolePermissions }) {
  const errors = []
  const byKey = new Map()

  for (const m of menus) {
    if (byKey.has(m.key)) errors.push(`duplicate menu key: ${m.key}`)
    byKey.set(m.key, m)
    if (!MENU_TYPES.includes(m.type)) {
      errors.push(`invalid type "${m.type}" on menu key: ${m.key}`)
    }
  }

  for (const m of menus) {
    if (m.parent_key === null) continue
    const parent = byKey.get(m.parent_key)
    if (!parent) {
      errors.push(`parent_key "${m.parent_key}" of "${m.key}" does not exist`)
    } else if (parent.type !== 'menu') {
      errors.push(`parent_key "${m.parent_key}" of "${m.key}" must be type menu (action is leaf)`)
    }
  }

  // depth + cycle: เดินขึ้นตาม parent chain ไม่เกิน MAX_DEPTH
  for (const m of menus) {
    const seen = new Set([m.key])
    let depth = 1
    let current = m
    while (current.parent_key !== null) {
      const parent = byKey.get(current.parent_key)
      if (!parent) break // รายงานไปแล้วข้างบน
      if (seen.has(parent.key)) {
        errors.push(`parent cycle detected at "${m.key}"`)
        break
      }
      seen.add(parent.key)
      depth += 1
      if (depth > MAX_DEPTH) {
        errors.push(`hierarchy depth exceeds ${MAX_DEPTH} levels at "${m.key}"`)
        break
      }
      current = parent
    }
  }

  const actionKeys = menus.filter((m) => m.type === 'action').map((m) => m.key)
  const seenPairs = new Set()
  for (const rp of rolePermissions) {
    const pair = pairKey(rp)
    if (seenPairs.has(pair)) errors.push(`duplicate (ou_id, role) pair: ${rp.role}`)
    seenPairs.add(pair)

    for (const entry of rp.menu_keys) {
      if (byKey.get(entry)?.type === 'menu') {
        errors.push(`menu_keys of "${rp.role}" references menu node "${entry}" (not a permission)`)
        continue
      }
      if (isWildcardEntry(entry)) {
        if (!actionKeys.some((k) => anyPermissionMatches([entry], k))) {
          errors.push(`wildcard "${entry}" of "${rp.role}" matches zero actions (likely a typo)`)
        }
      } else if (!actionKeys.includes(entry)) {
        errors.push(`menu_keys entry "${entry}" of "${rp.role}" matches no action`)
      }
    }
  }

  return errors
}

async function ensurePermissionIndexes(db) {
  const menusCol = db.collection(AUTH_COLLECTIONS.MENUS)
  const rolesCol = db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS)
  await menusCol.createIndex({ key: 1 }, { unique: true, name: 'uniq_menu_key' })
  await menusCol.createIndex({ parent_key: 1 }, { name: 'by_parent_key' })
  await rolesCol.createIndex({ ou_id: 1, role: 1 }, { unique: true, name: 'uniq_ou_role' })
}

function auditFields(now) {
  return {
    set: { upd_by: SEED_BY, upd_date: now, upd_prog: SEED_PROG },
    setOnInsert: { cr_by: SEED_BY, cr_date: now, cr_prog: SEED_PROG }
  }
}

/**
 * Sync ข้อมูลลง DB — เรียกได้จาก test (validate แล้วโยนเมื่อผิด)
 * @param {import('mongodb').Db} db
 * @param {{ menus: object[], rolePermissions: object[], prune: boolean, now?: Date }} p
 */
export async function syncPermissions(
  db,
  { menus, rolePermissions, prune = false, now = new Date() }
) {
  const errors = validateSeedData({ menus, rolePermissions })
  if (errors.length > 0) {
    throw new Error(`seed validation failed:\n- ${errors.join('\n- ')}`)
  }

  await ensurePermissionIndexes(db)
  const menusCol = db.collection(AUTH_COLLECTIONS.MENUS)
  const rolesCol = db.collection(AUTH_COLLECTIONS.ROLE_PERMISSIONS)
  const audit = auditFields(now)

  for (const m of menus) {
    await menusCol.updateOne(
      { key: m.key },
      {
        $set: {
          label: m.label,
          type: m.type,
          parent_key: m.parent_key,
          sort_order: m.sort_order,
          ou_id: m.ou_id,
          ...audit.set
        },
        $setOnInsert: audit.setOnInsert
      },
      { upsert: true }
    )
  }

  for (const rp of rolePermissions) {
    await rolesCol.updateOne(
      { ou_id: rp.ou_id, role: rp.role },
      {
        $set: { menu_keys: rp.menu_keys, ...audit.set },
        $setOnInsert: audit.setOnInsert
      },
      { upsert: true }
    )
  }

  const prunedMenuKeys = []
  const prunedRolePairs = []
  if (prune) {
    const seedKeys = new Set(menus.map((m) => m.key))
    const seedPairs = new Set(rolePermissions.map(pairKey))
    const menusToPrune = (await menusCol.find({}).toArray()).filter((d) => !seedKeys.has(d.key))
    const rolesToPrune = (await rolesCol.find({}).toArray()).filter(
      (d) => !seedPairs.has(pairKey(d))
    )
    prunedMenuKeys.push(...menusToPrune.map((d) => d.key))
    prunedRolePairs.push(...rolesToPrune.map(pairKey))
    if (menusToPrune.length) {
      await menusCol.deleteMany({ _id: { $in: menusToPrune.map((d) => d._id) } })
    }
    if (rolesToPrune.length) {
      await rolesCol.deleteMany({ _id: { $in: rolesToPrune.map((d) => d._id) } })
    }
  }

  return {
    menusUpserted: menus.length,
    rolesUpserted: rolePermissions.length,
    prunedMenuKeys,
    prunedRolePairs
  }
}

const isDirectRun = process.argv[1]?.endsWith('seed-permissions.js')
if (isDirectRun) {
  const uri = process.env.DATABASE_URI
  if (!uri) {
    console.error('DATABASE_URI is required')
    process.exit(1)
  }
  const prune = process.argv.includes('--prune')

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const result = await syncPermissions(client.db(), {
      menus: seedMenus,
      rolePermissions: seedRolePermissions,
      prune
    })
    console.log(
      `Seed permissions OK: menus=${result.menusUpserted} roles=${result.rolesUpserted}` +
        (prune
          ? ` | pruned menus: [${result.prunedMenuKeys.join(', ')}]` +
            ` | pruned roles: [${result.prunedRolePairs.join(', ')}]`
          : '')
    )
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}
