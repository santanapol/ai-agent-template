import { isBranchActive } from './branch-display.js'

/**
 * Shared branch access resolution for platform_branches and gpp su_branch.
 * @param {import('mongodb').Document | null | undefined} branch
 * @param {import('mongodb').ObjectId} ouId
 * @returns {'not_found' | 'forbidden' | 'inactive' | 'ok'}
 */
export function resolveBranchAccessFromDoc(branch, ouId) {
  if (!branch) return 'not_found'

  const branchOu = branch.ou_id?.toHexString?.() ?? String(branch.ou_id)
  const expectedOu = ouId?.toHexString?.() ?? String(ouId)
  if (branchOu !== expectedOu) return 'forbidden'
  if (!isBranchActive(branch.active)) return 'inactive'
  return 'ok'
}
