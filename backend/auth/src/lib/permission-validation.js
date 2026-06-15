import { isWildcardEntry, anyPermissionMatches } from './permission-match.js'

const MAX_DEPTH = 3
const MENU_TYPES = ['menu', 'action']

function pairKey(doc) {
  return `${doc.ou_id === null ? 'null' : String(doc.ou_id)}|${doc.role}`
}

/**
 * ตรวจข้อมูล seed ตามกฎใน SPEC (Hierarchy Rules + Registry integrity)
 * @param {{ menus: object[], rolePermissions: object[] }} param0
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
