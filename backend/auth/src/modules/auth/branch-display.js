/**
 * @param {unknown} active
 * @returns {boolean}
 */
export function isBranchActive(active) {
  if (active === false) return false
  if (active === 0 || active === '0') return false
  return true
}

/**
 * @param {import('mongodb').Document | null | undefined} doc
 * @returns {{ branch_id: string, branch_code: string | null, branch_name: string | null, active: boolean } | null}
 */
export function toBranchDisplay(doc) {
  if (!doc) return null

  const branchId =
    typeof doc._id?.toHexString === 'function' ? doc._id.toHexString() : String(doc._id)

  return {
    branch_id: branchId,
    branch_code: doc.branch_code ?? null,
    branch_name: doc.branch_name ?? null,
    active: isBranchActive(doc.active)
  }
}
