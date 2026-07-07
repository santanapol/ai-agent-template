export const authMixin = {
  async resolveEffectivePermissions({ ouId, role }) {
    let doc = await this.repo.findRolePermissions(ouId, role)
    if (!doc && ouId !== null) {
      doc = await this.repo.findRolePermissions(null, role)
    }
    return Array.isArray(doc?.menu_keys) ? doc.menu_keys : []
  }
}
