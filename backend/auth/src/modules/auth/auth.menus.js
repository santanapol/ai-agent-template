import { anyPermissionMatches } from '../../lib/permission-match.js'

export const authMixin = {
  async getMyMenus({ user_id_hex, access_token_gen_claim }) {
    const genCheck = await this.assertAccessTokenGenMatches({
      user_id_hex,
      token_gen_claim: access_token_gen_claim
    })
    if (!genCheck.ok) return genCheck
    const user = genCheck.user

    const normalizedOuId = user.ou_id ?? null
    const permissions = await this.resolveEffectivePermissions({
      ouId: normalizedOuId,
      role: user.role
    })
    const actions = await this.repo.findActionMenusForOu(normalizedOuId)
    const granted = actions.filter((action) => anyPermissionMatches(permissions, action.key))

    // เติมบรรพบุรุษทีละชั้นจนถึง root (ลึกสุด 3 ระดับ — วนไม่เกิน 2 รอบ)
    const byKey = new Map(granted.map((m) => [m.key, m]))
    let pendingKeys = this.collectPendingParentKeys(granted, byKey)
    while (pendingKeys.length > 0) {
      const parents = await this.repo.findMenusByKeys(pendingKeys, normalizedOuId)
      for (const parent of parents) byKey.set(parent.key, parent)
      pendingKeys = this.collectPendingParentKeys(parents, byKey)
    }

    // cap ที่ 3 ตามกฎความลึกใน SPEC — detect cycle และขึ้นลึก
    const depths = new Map()
    const depthOf = (menu) => {
      if (depths.has(menu.key)) return depths.get(menu.key)

      const seen = new Set()
      let depth = 0
      let current = menu
      while (current && current.parent_key !== null) {
        if (seen.has(current.key)) {
          throw new Error(`Menu hierarchy cycle detected: ${[...seen, current.key].join(' → ')}`)
        }
        seen.add(current.key)
        current = byKey.get(current.parent_key)
        depth += 1
        if (depth > 3) {
          throw new Error(
            `Menu hierarchy exceeds depth limit at key: ${menu.key} ` +
              `(traversed: ${[...seen].join(' → ')})`
          )
        }
      }
      depths.set(menu.key, depth)
      return depth
    }

    const menus = [...byKey.values()]
      .sort((a, b) => depthOf(a) - depthOf(b) || a.sort_order - b.sort_order)
      .map((m) => ({
        key: m.key,
        label: m.label,
        type: m.type,
        parent_key: m.parent_key,
        sort_order: m.sort_order
      }))

    return { ok: true, status: 200, body: { menus } }
  },

  collectPendingParentKeys(menus, byKey) {
    const pending = new Set()
    for (const menu of menus) {
      const key = menu.parent_key
      if (key !== null && !byKey.has(key)) pending.add(key)
    }
    return [...pending]
  }
}
